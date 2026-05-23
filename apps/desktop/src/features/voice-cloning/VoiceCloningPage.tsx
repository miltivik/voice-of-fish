import { useState } from "react";
import { MOCK_VOICES } from "@voice-of-fish/shared/constants";
import { voicePresetSchema } from "@voice-of-fish/shared/schemas";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function VoiceCloningPage() {
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const readFile = (file?: File) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (!file) return;
    const parsed = voicePresetSchema.shape.referenceFileName.safeParse(file.name);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0].message);
      return;
    }
    setMessage("");
    setPreviewUrl(URL.createObjectURL(file));
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Voices</h1>
        <p className="mt-1 text-sm text-muted">
          Reference audio upload and voice preset library.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reference audio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label
            htmlFor="reference-audio"
            className="text-sm font-medium text-studio-foreground"
          >
            Reference audio
          </label>
          <input
            id="reference-audio"
            type="file"
            accept=".wav,.mp3,.flac"
            className="block w-full text-sm text-muted file:mr-3 file:rounded file:border-0 file:bg-accent file:px-3 file:py-1 file:text-xs file:font-medium file:text-studio hover:file:bg-accent/90"
            onChange={(event) => readFile(event.target.files?.[0])}
          />
          {message && (
            <p role="alert" className="text-sm text-danger">
              {message}
            </p>
          )}
          {previewUrl && !message && (
            <p className="text-sm text-accent">Reference audio accepted.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Voice presets</CardTitle>
          <Badge variant="secondary">{MOCK_VOICES.length} preset</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {MOCK_VOICES.map((voice) => (
            <article
              key={voice.id}
              className="rounded-md border border-line bg-studio p-3"
            >
              <p className="text-sm font-medium text-studio-foreground">
                {voice.name} / {voice.referenceFileName}
              </p>
              <p className="mt-1 text-xs text-muted">{voice.referenceText}</p>
              <p className="mt-1 text-xs text-muted">
                {voice.language.toUpperCase()}
                {voice.durationSeconds != null &&
                  ` \u00b7 ${voice.durationSeconds}s`}
              </p>
            </article>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
