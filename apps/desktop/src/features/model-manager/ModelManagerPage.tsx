import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
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

  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    let unlistenFn: (() => void) | undefined;
    listen<{ modelId: string; downloaded: number; total: number }>(
      "download-progress",
      (event) => {
        setDownloadProgress((prev) => ({
          ...prev,
          [event.payload.modelId]: event.payload.downloaded / event.payload.total,
        }));
      },
    )
      .then((fn) => { unlistenFn = fn; })
      .catch(() => {
        // Tauri runtime not available (e.g., in tests without Tauri mock)
      });
    return () => { unlistenFn?.(); };
  }, []);

  const clearProgress = (modelId: string) => {
    setDownloadProgress((prev) => {
      const next = { ...prev };
      delete next[modelId];
      return next;
    });
  };

  const models = useQuery({
    queryKey: ["models"],
    queryFn: studioClient.listLocalModels,
  });

  const sync = (next: ModelManifestEntry[]) => queryClient.setQueryData(["models"], next);

  const download = useMutation({
    mutationFn: studioClient.downloadModel,
    onSuccess: (next, modelId) => {
      sync(next);
      clearProgress(modelId);
      toast.success(`${modelId.toUpperCase()} installed`);
    },
    onError: (_, modelId) => {
      clearProgress(modelId);
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
          Manage installed GGUF models.
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
            progress={downloadProgress[model.id]}
          />
        ))}
      </div>
    </section>
  );
}
