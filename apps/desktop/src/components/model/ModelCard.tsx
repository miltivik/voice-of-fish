import type { ModelManifestEntry } from "@voice-of-fish/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ModelCard({
  model,
  isActive,
  onDownload,
  onDelete,
  onSetActive,
}: {
  model: ModelManifestEntry;
  isActive: boolean;
  onDownload: () => void;
  onDelete: () => void;
  onSetActive: () => void;
}) {
  const installed = model.state === "installed";

  return (
    <article className="rounded-lg border border-line bg-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-studio-foreground">
          {model.quant}
        </h2>
        {installed && (
          <div className="flex items-center gap-2">
            {isActive ? (
              <Badge>Active</Badge>
            ) : (
              <Button variant="secondary" size="sm" onClick={onSetActive}>
                Set active
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={onDelete}>
              Delete
            </Button>
          </div>
        )}
      </div>
      <p className="mt-1 text-sm text-studio-foreground">
        {model.filename} / {model.displaySize}
      </p>
      <p className="mt-2 text-sm text-muted">{model.recommendation}</p>
      <div className="mt-3 flex items-center gap-2">
        {model.tokenizerRequired && (
          <Badge variant="secondary">Tokenizer</Badge>
        )}
        <Badge variant={installed ? "default" : "secondary"}>
          {model.quant} {installed ? "installed" : "not installed"}
        </Badge>
      </div>
      {!installed && (
        <div className="mt-3">
          <Button onClick={onDownload}>Download {model.quant}</Button>
        </div>
      )}
    </article>
  );
}
