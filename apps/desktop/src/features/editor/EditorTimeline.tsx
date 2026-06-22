import type { SentenceClip } from "@voice-of-fish/shared";
import { toast } from "sonner";

import { pickFolderPath, studioClient } from "@/lib/tauri";
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

interface ClipItemProps {
  clip: SentenceClip;
  i: number;
  duration: number;
  widthPercent: number;
  onUpdateClipText: (index: number, text: string) => void;
  onPlayAudio: (wavPath: string) => Promise<void> | void;
}

function ClipItem({
  clip,
  i,
  duration,
  widthPercent,
  onUpdateClipText,
  onPlayAudio,
}: ClipItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-brutal border border-glass-border bg-concrete-800 px-3 py-2">
      <span className="w-6 text-center text-xs tabular-nums text-concrete-300">
        {i + 1}
      </span>
      <div className="min-w-0 flex-1">
        <input
          value={clip.text}
          onChange={(e) => onUpdateClipText(i, e.target.value)}
          className="w-full truncate bg-transparent text-sm text-concrete-50 outline-none"
          aria-label={`Edit subtitle ${i + 1}`}
        />
        <p className="mt-0.5 text-xs text-concrete-300">
          {formatTime(clip.startMs)} → {formatTime(clip.endMs)}
          {" · "}
          {duration < 1000
            ? `${duration}ms`
            : `${(duration / 1000).toFixed(1)}s`}
        </p>
        <button
          type="button"
          onClick={() => onPlayAudio(clip.wavPath)}
          className="shrink-0 rounded-brutal px-2 py-1 text-xs font-medium text-concrete-300 transition-colors hover:bg-glass-heavy hover:text-concrete-50"
          title="Play clip"
        >
          {"▶"}
        </button>
        <div
          className="h-2 rounded-full bg-electric/30"
          style={{ width: `${widthPercent}%`, maxWidth: 120 }}
        >
          <div
            className="h-full rounded-full bg-electric"
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}

interface EditorTimelineProps {
  clips: SentenceClip[];
  totalDuration: number;
  regenKey: number;
  onUpdateClipText: (index: number, text: string) => void;
  onPlayAudio: (wavPath: string) => Promise<void> | void;
}

export function EditorTimeline({
  clips,
  totalDuration,
  regenKey,
  onUpdateClipText,
  onPlayAudio,
}: EditorTimelineProps) {
  return (
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
          return (
            <ClipItem
              key={`${regenKey}-${clip.wavPath}-${i}`}
              clip={clip}
              i={i}
              duration={clip.endMs - clip.startMs}
              widthPercent={
                totalDuration > 0
                  ? Math.max(
                      ((clip.endMs - clip.startMs) / totalDuration) * 100,
                      2,
                    )
                  : 100 / clips.length
              }
              onUpdateClipText={onUpdateClipText}
              onPlayAudio={onPlayAudio}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
