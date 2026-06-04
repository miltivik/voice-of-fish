import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProcessLogPanel } from "@/components/logs/ProcessLogPanel";
import { studioClient, checkBinaryExists } from "@/lib/tauri";

export function DiagnosticsPage() {
  const info = useQuery({
    queryKey: ["system-info"],
    queryFn: async () => {
      const [systemInfo, config] = await Promise.all([
        studioClient.getSystemInfo(),
        studioClient.getAppConfig(),
      ]);
      const binaryFound = config?.binaryPath
        ? await checkBinaryExists(config.binaryPath)
        : false;
      return { ...systemInfo, binaryFound };
    },
  });
  const logs = useQuery({
    queryKey: ["generation-logs"],
    queryFn: () => studioClient.readGenerationLogs(),
  });

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Diagnostics</h1>
        <p className="mt-1 text-sm text-concrete-300">System and engine health.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {info.isLoading ? (
            <p className="text-sm text-concrete-300">Loading system info…</p>
          ) : info.isError ? (
            <p className="text-sm text-ember">Failed to load system info.</p>
          ) : (
            <>
              <p className="text-sm text-concrete-50">
                {info.data?.os} / {info.data?.cpu} / {info.data?.ramLabel}
              </p>
              <p className="text-sm text-concrete-300">
                GPU: {info.data?.gpu ?? "Not detected"}
              </p>
              <p className="text-sm text-concrete-300">
                App: {info.data?.appVersion}
                {info.data?.engineVersion &&
                  ` / Engine: ${info.data.engineVersion}`}
              </p>
              <p className="text-sm text-concrete-300">
                Binary:{" "}
                <span
                  className={
                    info.data?.binaryFound
                      ? "text-electric"
                      : "text-ember"
                  }
                >
                  {info.data?.binaryFound ? "Found" : "Missing"}
                </span>
              </p>
            </>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Process logs</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.isLoading ? (
            <p className="text-sm text-concrete-300">Loading logs…</p>
          ) : logs.isError ? (
            <p className="text-sm text-ember">Failed to load process logs.</p>
          ) : (
            <ProcessLogPanel lines={logs.data ?? []} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
