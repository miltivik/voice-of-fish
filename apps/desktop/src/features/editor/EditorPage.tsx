import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LANGUAGE_OPTIONS } from "@voice-of-fish/shared/constants";
import type { SentenceClip } from "@voice-of-fish/shared";
import { toast } from "sonner";
import { studioClient, pickFolderPath } from "@/lib/tauri";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(2, "0")}`;
}

/** Split text into max 2 lines, ~42 chars each, at word boundaries. */
function splitSubtitleLines(text: string, maxLine = 42): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLine) return trimmed;

  let splitAt = maxLine;
  while (splitAt > 0 && trimmed[splitAt] !== " ") splitAt--;
  if (splitAt === 0) splitAt = maxLine;

  const first = trimmed.slice(0, splitAt).trim();
  let second = trimmed.slice(splitAt).trim();
  if (second.length > maxLine) second = second.slice(0, maxLine) + "…";
  return `${first}\n${second}`;
}

 function formatSrt(clips: SentenceClip[]): string {
  return clips
    .map((clip, i) => {
      const start = formatTime(clip.startMs).replace(".", ",");
      const end = formatTime(clip.endMs).replace(".", ",");
      return `${i + 1}\n${start} --> ${end}\n${splitSubtitleLines(clip.text)}\n`;
    })
    .join("\n");
}

export function EditorPage() {
  const [script, setScript] = useState("");
  const [language, setLanguage] = useState("en");
  const [modelId, setModelId] = useState("s2-q6");
  const [voicePresetId, setVoicePresetId] = useState("");
  const [clips, setClips] = useState<SentenceClip[]>([]);

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
      studioClient.generateSentences(script, language, modelId, voicePresetId || undefined),
    onSuccess: (data) => {
      setClips(data);
      toast.success(`Generated ${data.length} clip(s)`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Generation failed: ${message}`);
    },
  });

  const totalDuration = clips.reduce((sum, c) => sum + (c.endMs - c.startMs), 0);

  function updateClipText(index: number, text: string) {
    setClips((prev) =>
      prev.map((c, i) => (i === index ? { ...c, text } : c)),
    );
  }

  const sentenceCount = script
    .split(/[.!?]/)
    .filter((s) => s.trim().length > 0).length;

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Editor</h1>
        <p className="mt-1 text-sm text-muted">
          Paste a script, generate each sentence as a clip, and export for
          DaVinci Resolve.
        </p>
      </div>
      {/* Script input */}
      <Card>
        <CardHeader>
          <CardTitle>Script</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={8}
            placeholder={`Welcome to the show. Today we explore artificial intelligence. But first, a word from our sponsor.`}
            className="flex min-h-[160px] w-full rounded-md border border-line bg-studio px-3 py-2 text-sm text-studio-foreground shadow-sm transition-colors placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-studio"
          />

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="editor-model" className="text-xs font-medium text-muted">Model</label>
              <select
                id="editor-model"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="h-8 rounded-md border border-line bg-studio px-2 text-xs text-studio-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                {installedModels.map((m) => (
                  <option key={m.id} value={m.id}>{m.quant}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="editor-voice" className="text-xs font-medium text-muted">Voice</label>
              <select
                id="editor-voice"
                value={voicePresetId}
                onChange={(e) => setVoicePresetId(e.target.value)}
                className="h-8 rounded-md border border-line bg-studio px-2 text-xs text-studio-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <option value="">None</option>
                {(presets.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="editor-language" className="text-xs font-medium text-muted">Language</label>
              <select
                id="editor-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="h-8 rounded-md border border-line bg-studio px-2 text-xs text-studio-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                {LANGUAGE_OPTIONS.map((lang) => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>

            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || script.trim().length === 0}
            >
              {generateMutation.isPending
                ? `Generating ${sentenceCount} sentence(s)…`
                : `Generate ${sentenceCount} sentence(s)`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {clips.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              Timeline · {clips.length} clip(s) · Total {formatTime(totalDuration)}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(formatSrt(clips)).catch(() => {});
                  toast.success("SRT copied to clipboard");
                }}
              >
                Copy SRT
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const dir = await pickFolderPath("Select export folder");
                  if (!dir) return;
                  try {
                    const msg = await studioClient.exportEditorBundle(clips, dir);
                    toast.success(msg);
                  } catch (e) {
                    toast.error(`Export failed: ${e}`);
                  }
                }}
              >
                Export for Resolve
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {clips.map((clip, i) => {
              const duration = clip.endMs - clip.startMs;
              const widthPercent = totalDuration > 0
                ? Math.max((duration / totalDuration) * 100, 2)
                : 100 / clips.length;

              return (
                <div
                  key={clip.wavPath}
                  className="flex items-center gap-3 rounded-md border border-line bg-studio px-3 py-2"
                >
                  <span className="w-6 text-center text-xs tabular-nums text-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <input
                      value={clip.text}
                      onChange={(e) => updateClipText(i, e.target.value)}
                      className="w-full truncate bg-transparent text-sm text-studio-foreground outline-none"
                      aria-label={`Edit subtitle ${i + 1}`}
                    />
                    <p className="mt-0.5 text-xs text-muted">
                      {formatTime(clip.startMs)} → {formatTime(clip.endMs)}
                      {" · "}
                      {duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const audio = new Audio(clip.wavPath);
                      audio.play().catch(() => {});
                    }}
                    className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-line/40 hover:text-studio-foreground"
                    title="Play clip"
                  >
                    {"▶"}
                  </button>
                  <div
                    className="h-2 rounded-full bg-accent/30"
                    style={{ width: `${widthPercent}%`, maxWidth: 120 }}
                  >
                    <div className="h-full rounded-full bg-accent" style={{ width: "100%" }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
