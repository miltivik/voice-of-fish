import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HistoryPage() {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">History</h1>
        <p className="mt-1 text-sm text-muted">Generation history placeholder.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent output</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">Mock generation completed at C:\\voice-of-fish\\outputs.</p>
        </CardContent>
      </Card>
    </section>
  );
}
