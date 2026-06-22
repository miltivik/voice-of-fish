import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { SentenceClip } from "@voice-of-fish/shared";
import { toast } from "sonner";

import { studioClient } from "@/lib/tauri";
import { EditorScriptCard } from "./EditorScriptCard";
import { EditorTimeline } from "./EditorTimeline";

export function EditorPage() {
  const [script, setScript] = useState("");
  const [language, setLanguage] = useState("en");
  const [modelId, setModelId] = useState("s2-q6");
  const [voicePresetId, setVoicePresetId] = useState("");
  const [clips, setClips] = useState<SentenceClip[]>([]);
  const [regenKey, setRegenKey] = useState(0);

  // Cleanup audio + revoke blob URLs on unmount.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  // Monotonic id assigned to each in-flight playClipAudio call. If a newer
  // call starts while an older `readAudioBytes` is still pending, the older
  // call revokes its own URL on resolution and aborts — without this, two
  // racing reads could overwrite `blobUrlRef.current` and leak the first URL.
  const playRequestIdRef = useRef(0);
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
        audioRef.current = null;
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  async function playClipAudio(wavPath: string) {
    const myRequestId = ++playRequestIdRef.current;
    try {
      // Destroy previous audio instance to prevent memory leaks.
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
        audioRef.current = null;
      }
      // Revoke any previous blob URL so we don't leak memory.
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      const url = await studioClient.readAudioBytes(wavPath);
      // A newer call has started while we were waiting on the IPC.
      // Revoke the URL we just received and bail out — the newer call
      // already owns the slot.
      if (myRequestId !== playRequestIdRef.current) {
        URL.revokeObjectURL(url);
        return;
      }
      blobUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play().catch(() => {
        // Only surface a toast for the still-current request. Stale
        // requests already revoked their URL and bailed above.
        if (myRequestId === playRequestIdRef.current) {
          toast.error("Cannot play audio — file may be missing");
        }
      });
    } catch {
      // Same guard for the outer catch — a stale call shouldn't toast.
      if (myRequestId === playRequestIdRef.current) {
        toast.error("Cannot load audio file");
      }
    }
  }

  const models = useQuery({
    queryKey: ["models"],
    queryFn: studioClient.listLocalModels,
  });
  const installedModels = (models.data ?? []).filter(
    (m) => m.state === "installed",
  );

  const presets = useQuery({
    queryKey: ["voice-presets"],
    queryFn: studioClient.listVoicePresets,
    staleTime: 30_000,
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      studioClient.generateSentences(
        script,
        language,
        modelId,
        voicePresetId || undefined,
      ),
    onSuccess: (data) => {
      setClips(data);
      setRegenKey((k) => k + 1);
      toast.success(`Generated ${data.length} clip(s)`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Generation failed: ${message}`);
    },
  });

  const totalDuration = clips.reduce(
    (sum, c) => sum + (c.endMs - c.startMs),
    0,
  );

  function updateClipText(index: number, text: string) {
    setClips((prev) => prev.map((c, i) => (i === index ? { ...c, text } : c)));
  }

  const sentenceCount = script
    .split(/[.!?]/)
    .filter((s) => s.trim().length > 0).length;

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Editor</h1>
        <p className="mt-1 text-sm text-concrete-300">
          Paste a script, generate each sentence as a clip, and export for
          DaVinci Resolve.
        </p>
      </div>

      <EditorScriptCard
        script={script}
        onScriptChange={setScript}
        installedModels={installedModels}
        voicePresets={presets.data ?? []}
        modelId={modelId}
        onModelIdChange={setModelId}
        voicePresetId={voicePresetId}
        onVoicePresetIdChange={setVoicePresetId}
        language={language}
        onLanguageChange={setLanguage}
        sentenceCount={sentenceCount}
        isGenerating={generateMutation.isPending}
        onGenerate={() => generateMutation.mutate()}
      />

      {clips.length > 0 && (
        <EditorTimeline
          clips={clips}
          totalDuration={totalDuration}
          regenKey={regenKey}
          onUpdateClipText={updateClipText}
          onPlayAudio={playClipAudio}
        />
      )}
    </section>
  );
}
