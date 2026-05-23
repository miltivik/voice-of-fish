import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function VoiceCloningPage() {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Voices</h1>
        <p className="mt-1 text-sm text-muted">Voice library placeholder for later cloning flow.</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Reference voices</CardTitle>
          <Badge variant="secondary">Mock</Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">No custom speakers imported. Built-in demo speaker available.</p>
        </CardContent>
      </Card>
    </section>
  );
}
