import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useModelStore } from "@/stores/useModelStore";

export function ModelManagerPage() {
  const activeModelId = useModelStore((state) => state.activeModelId);

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Models</h1>
        <p className="mt-1 text-sm text-muted">Installed model inventory stub.</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Active model</CardTitle>
          <Badge>{activeModelId}</Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">Model download, delete, and validation controls arrive later.</p>
        </CardContent>
      </Card>
    </section>
  );
}
