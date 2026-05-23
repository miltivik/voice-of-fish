import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DiagnosticsPage() {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Diagnostics</h1>
        <p className="mt-1 text-sm text-muted">System and engine health stub.</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Runtime checks</CardTitle>
          <Badge variant="secondary">Mock pass</Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">Tauri bridge, model folder, and output folder checks pending.</p>
        </CardContent>
      </Card>
    </section>
  );
}
