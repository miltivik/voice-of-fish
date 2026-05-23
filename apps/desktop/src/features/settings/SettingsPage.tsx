import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function SettingsPage() {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Settings</h1>
        <p className="mt-1 text-sm text-muted">Local app configuration placeholder.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Paths</CardTitle>
        </CardHeader>
        <CardContent>
          <Input disabled defaultValue="C:\\voice-of-fish\\models" aria-label="Models path" />
        </CardContent>
      </Card>
    </section>
  );
}
