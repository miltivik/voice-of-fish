import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { studioClient } from "@/lib/tauri";
import type { VoicePreset } from "@voice-of-fish/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VoicePresetForm } from "./VoicePresetForm";
import { VoicePresetList } from "./VoicePresetList";

export function VoiceCloningPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<VoicePreset | null>(null);
  const [search, setSearch] = useState("");
  const [formVisible, setFormVisible] = useState(false);

  const presets = useQuery({
    queryKey: ["voice-presets"],
    queryFn: studioClient.listVoicePresets,
  });

  const saveMutation = useMutation({
    mutationFn: (preset: VoicePreset) => studioClient.saveVoicePreset(preset),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["voice-presets"] });
      toast.success(editing ? "Voice preset updated" : "Voice preset saved");
      setEditing(saved);
      setFormVisible(false);
    },
    onError: () => toast.error("Failed to save voice preset"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studioClient.deleteVoicePreset(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: ["voice-presets"] });
      toast.success("Voice preset deleted");
      if (editing?.id === id) {
        setEditing(null);
        setFormVisible(false);
      }
    },
    onError: () => toast.error("Failed to delete voice preset"),
  });

  const startAdd = () => {
    setEditing(null);
    setFormVisible(true);
  };

  const startEdit = (preset: VoicePreset) => {
    setEditing(preset);
    setFormVisible(true);
  };

  const cancelForm = () => {
    setFormVisible(false);
    setEditing(null);
  };

  const handleDelete = (preset: VoicePreset) => {
    if (
      window.confirm(
        `Delete voice preset "${preset.name}"? This cannot be undone.`,
      )
    ) {
      deleteMutation.mutate(preset.id);
    }
  };

  const handleSave = (preset: VoicePreset) => {
    saveMutation.mutate(preset);
  };

  const filtered = (presets.data ?? []).filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.language.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Voices</h1>
        <p className="mt-1 text-sm text-concrete-300">
          Voice presets for cloning — save a reference audio and reuse it across
          generations.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search presets…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex-1" />
        <Button onClick={startAdd} disabled={formVisible}>
          Add voice
        </Button>
      </div>

      {/* Add / Edit Form — collapsible */}
      {formVisible && (
        <VoicePresetForm
          initialData={editing}
          onSave={handleSave}
          onCancel={cancelForm}
          isSaving={saveMutation.isPending}
        />
      )}

      {/* Presets list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Your presets
            {(presets.data?.length ?? 0) > 0 && ` (${presets.data!.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <VoicePresetList
            presets={filtered}
            onEdit={startEdit}
            onDelete={handleDelete}
            isDeleting={deleteMutation.isPending}
            editingId={editing?.id ?? null}
            isLoading={presets.isLoading}
            isError={presets.isError}
            searchQuery={search}
          />
        </CardContent>
      </Card>
    </section>
  );
}
