import { join } from "@tauri-apps/api/path";
import { copyFile } from "@tauri-apps/plugin-fs";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ModelManifestEntry } from "@voice-of-fish/shared";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ModelCard } from "@/components/model/ModelCard";
import { studioClient } from "@/lib/tauri";
import { useAppStore } from "@/stores/useAppStore";
import { useModelStore } from "@/stores/useModelStore";
export function ModelManagerPage() {
  const queryClient = useQueryClient();
  const activeModelId = useModelStore((state) => state.activeModelId);
  const setActiveModelId = useModelStore((state) => state.setActiveModelId);
  const config = useAppStore((state) => state.config);

  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);


  useEffect(() => {
    let cancelled = false;
    let unlistenFn: (() => void) | undefined;

    listen<{ modelId: string; downloaded: number; total: number }>(
      "download-progress",
      (event) => {
        if (cancelled) return;
        setDownloadProgress((prev) => ({
          ...prev,
          [event.payload.modelId]: event.payload.downloaded / event.payload.total,
        }));
      },
    )
      .then((fn) => {
        if (cancelled) {
          fn();
        } else {
          unlistenFn = fn;
        }
      })
      .catch(() => {
        // Tauri runtime not available (e.g., in tests without Tauri mock)
      });

    return () => {
      cancelled = true;
      unlistenFn?.();
    };
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

  const handleOpenModelsFolder = useCallback(() => {
    if (config?.modelsPath) {
      studioClient.openOutputFolder(config.modelsPath).catch(() => {
        toast.error("Failed to open models folder");
      });
    }
  }, [config?.modelsPath]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      dragCounter.current = 0;

      const file = e.dataTransfer.files[0];
      if (!file) return;

      const fileName = file.name ?? "";
      if (!fileName.endsWith(".gguf")) {
        toast.error("Only .gguf files are supported");
        return;
      }

      const sourcePath = (file as File & { path?: string }).path;
      if (!sourcePath) {
        toast.error("Could not read file path");
        return;
      }

      const modelsPath = config?.modelsPath;
      if (!modelsPath) {
        toast.error("Models path not configured");
        return;
      }

      try {
        const destPath = await join(modelsPath, fileName);
        await copyFile(sourcePath, destPath);
        await queryClient.invalidateQueries({ queryKey: ["models"] });
        toast.success(`${fileName} copied to models`);
      } catch (err) {
        toast.error(`Failed to copy model: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [config?.modelsPath, queryClient],
  );

  if (models.isLoading) {
    return (
      <section className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Models</h1>
        </div>
        <p className="text-sm text-concrete-300">Loading model catalog…</p>
      </section>
    );
  }

  if (models.isError) {
    return (
      <section className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Models</h1>
        </div>
        <p className="text-sm text-ember">Failed to load model catalog.</p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Models</h1>
          <p className="mt-1 text-sm text-concrete-300">
            Manage installed GGUF models.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleOpenModelsFolder}
          disabled={!config?.modelsPath}
        >
          Open models folder
        </Button>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-brutal border-2 border-dashed p-6 text-center transition-colors ${
          isDragOver
            ? "border-electric bg-electric/10 text-electric"
            : "border-glass-border text-concrete-300"
        }`}
      >
        <p className="text-sm font-mono">
          {isDragOver ? "Drop .gguf file here" : "Drag and drop a .gguf file here"}
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