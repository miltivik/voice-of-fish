import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function GenerationPage() {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Generate</h1>
        <p className="mt-1 text-sm text-muted">Draft text surface wired as mock state only.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Prompt draft</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea disabled defaultValue="Generation pipeline arrives in later task." />
        </CardContent>
      </Card>
    </section>
  );
}
