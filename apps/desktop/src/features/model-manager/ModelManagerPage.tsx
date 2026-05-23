import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ModelManifestEntry } from "@voice-of-fish/shared";
import { toast } from "sonner";
import { ModelCard } from "@/components/model/ModelCard";
import { studioClient } from "@/lib/tauri";
import { useModelStore } from "@/stores/useModelStore";

export function ModelManagerPage() {
  const queryClient = useQueryClient();
  const activeModelId = useModelStore((state) => state.activeModelId);
  const setActiveModelId = useModelStore((state) => state.setActiveModelId);

  const models = useQuery({
    queryKey: ["models"],
    queryFn: studioClient.listLocalModels,
  });

  const sync = (next: unknown) => queryClient.setQueryData(["models"], next);

  const download = useMutation({
    mutationFn: studioClient.downloadModel,
    onSuccess: (next, modelId) => {
      sync(next);
      toast.success(`${modelId.toUpperCase()} installed`);
    },
    onError: (_, modelId) => {
      toast.error(`Failed to install ${modelId.toUpperCase()}`);
    },
  });

  const remove = useMutation({
    mutationFn: studioClient.deleteModel,
    onSuccess: (next, deletedModelId) => {
      sync(next);
      toast.success("Model removed");
      if (activeModelId === deletedModelId) {
        const installed = (next as ModelManifestEntry[]).find(
          (m) => m.state === "installed",
        );
        if (installed) {
          setActiveModelId(installed.id);
        }
      }
    },
    onError: () => {
      toast.error("Failed to remove model");
    },
  });

  if (models.isLoading) {
    return (
      <section className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Models</h1>
        </div>
        <p className="text-sm text-muted">Loading model catalog…</p>
      </section>
    );
  }

  if (models.isError) {
    return (
      <section className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Models</h1>
        </div>
        <p className="text-sm text-danger">Failed to load model catalog.</p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Models</h1>
        <p className="mt-1 text-sm text-muted">
          GGUF model manager mock state.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {models.data?.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            isActive={model.id === activeModelId}
            onDownload={() => download.mutate(model.id)}
            onDelete={() => remove.mutate(model.id)}
            onSetActive={() => setActiveModelId(model.id)}
          />
        ))}
      </div>
    </section>
  );
}
