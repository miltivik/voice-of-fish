import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function DashboardPage() {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Mock studio overview for local voice generation.</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Queue state</CardTitle>
          <Badge>Idle</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted">No generation jobs running. Engine warm-start cache ready.</p>
          <Progress value={72} aria-label="Mock cache readiness" />
        </CardContent>
      </Card>
    </section>
  );
}
