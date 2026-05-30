import { useCallback, useEffect, useRef, useState } from "react";
import { copyToClipboard } from "@/lib/clipboard";
import { getGuideMessages, type GuideLanguage } from "@/lib/i18n";
import { openExternalLink } from "@/lib/tauri";

const WINDOWS_COMMANDS = `git clone --recurse-submodules https://github.com/rodrigomatta/s2.cpp.git
cd s2.cpp
cmake -B build -DCMAKE_BUILD_TYPE=Release -DS2_VULKAN=ON
cmake --build build --config Release --parallel
powershell -ExecutionPolicy ByPass -c "irm https://hf.co/cli/install.ps1 | iex"
hf download rodrigomt/s2-pro-gguf s2-pro-q6_k.gguf tokenizer.json --local-dir .`;

const LINUX_COMMANDS = `git clone --recurse-submodules https://github.com/rodrigomatta/s2.cpp.git
cd s2.cpp
cmake -B build -DCMAKE_BUILD_TYPE=Release -DS2_VULKAN=ON
cmake --build build --parallel "$(nproc)"
curl -LsSf https://hf.co/cli/install.sh | bash
hf download rodrigomt/s2-pro-gguf s2-pro-q6_k.gguf tokenizer.json --local-dir .`;

interface LanguageSelectorProps {
  language: GuideLanguage;
  onChange: (language: GuideLanguage) => void;
}

function LanguageSelector({ language, onChange }: LanguageSelectorProps) {
  const copy = getGuideMessages(language);

  return (
    <fieldset className="space-y-1">
      <legend className="text-xs font-medium text-muted">
        {copy.languageLabel}
      </legend>
      <div className="flex gap-2">
        {(["es", "en"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={language === value}
            onClick={() => onChange(value)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              language === value
                ? "border-accent bg-accent/10 text-accent"
                : "border-line text-muted hover:text-studio-foreground"
            }`}
          >
            {value === "es" ? copy.spanish : copy.english}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function CommandBlock({
  label,
  value,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await copyToClipboard(value);
      setCopied(true);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write denied — silently skip
    }
  }, [value]);

  return (
    <section className="space-y-1">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-studio-foreground">
          {label}
        </h4>
        <button
          type="button"
          onClick={handleCopy}
          disabled={copied}
          className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            copied
              ? "bg-accent/10 text-accent"
              : "bg-line/50 text-muted hover:text-studio-foreground"
          }`}
        >
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-md border border-line bg-studio p-3 text-[11px] leading-relaxed text-muted">
        <code>{value}</code>
      </pre>
    </section>
  );
}

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function OnboardingInstallGuide() {
  const [language, setLanguage] = useState<GuideLanguage>("es");
  const [showFullGuide, setShowFullGuide] = useState(false);
  const copy = getGuideMessages(language);

  if (showFullGuide) {
    return (
      <article
        aria-labelledby="full-install-guide-title"
        className="space-y-5 rounded-lg border border-line bg-panel/40 px-4 py-4"
      >
        <div className="space-y-3">
          <h3 id="full-install-guide-title" className="text-base font-semibold">
            {copy.fullGuideHeading}
          </h3>
          <LanguageSelector language={language} onChange={setLanguage} />
        </div>

        <section className="space-y-1">
          <h4 className="text-sm font-semibold">{copy.communityHeading}</h4>
          <p className="text-xs leading-relaxed text-muted">
            {copy.communityBody}
          </p>
        </section>

        <section className="space-y-2">
          <h4 className="text-sm font-semibold">{copy.windowsHeading}</h4>
          <p className="text-xs leading-relaxed text-muted">
            {copy.windowsBody}
          </p>
          <CommandBlock
            label={copy.windowsPowerShell}
            value={WINDOWS_COMMANDS}
            copyLabel={copy.copyButton}
            copiedLabel={copy.copiedLabel}
          />
        </section>

        <section className="space-y-2">
          <h4 className="text-sm font-semibold">{copy.linuxHeading}</h4>
          <p className="text-xs leading-relaxed text-muted">{copy.linuxBody}</p>
          <CommandBlock
            label={copy.linuxShell}
            value={LINUX_COMMANDS}
            copyLabel={copy.copyButton}
            copiedLabel={copy.copiedLabel}
          />
        </section>

        <section className="space-y-1">
          <h4 className="text-sm font-semibold">{copy.modelHeading}</h4>
          <p className="text-xs leading-relaxed text-muted">{copy.modelBody}</p>
        </section>

        <section className="space-y-1">
          <h4 className="text-sm font-semibold">
            {copy.binaryLocationsHeading}
          </h4>
          <BulletList items={copy.binaryLocations} />
        </section>

        <section className="space-y-1">
          <h4 className="text-sm font-semibold">{copy.requiredFilesHeading}</h4>
          <BulletList items={copy.requiredFiles} />
        </section>

        <section className="space-y-1">
          <h4 className="text-sm font-semibold">{copy.returnHeading}</h4>
          <BulletList items={copy.returnSteps} />
        </section>

        <section className="space-y-1">
          <h4 className="text-sm font-semibold">
            {copy.troubleshootingHeading}
          </h4>
          <BulletList items={copy.troubleshootingSteps} />
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => openExternalLink("engineSource")}
            className="text-xs text-muted underline underline-offset-2 transition-colors hover:text-studio-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {copy.sourceButton}
          </button>
          <button
            type="button"
            onClick={() => openExternalLink("ggufSource")}
            className="text-xs text-muted underline underline-offset-2 transition-colors hover:text-studio-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {copy.modelsButton}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowFullGuide(false)}
          className="rounded-lg bg-line/50 px-4 py-2 text-sm font-medium text-studio-foreground transition-colors hover:bg-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {copy.backButton}
        </button>
      </article>
    );
  }

  return (
    <details className="rounded-lg border border-line bg-panel/40 px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium text-studio-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        {copy.quickSummary}
      </summary>
      <div className="mt-4 space-y-4">
        <LanguageSelector language={language} onChange={setLanguage} />
        <p className="text-xs leading-relaxed text-muted">{copy.quickIntro}</p>
        <ol className="list-decimal space-y-1 pl-5 text-xs leading-relaxed text-muted">
          {copy.quickSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <CommandBlock
          label={copy.windowsPowerShell}
          value={WINDOWS_COMMANDS}
          copyLabel={copy.copyButton}
          copiedLabel={copy.copiedLabel}
        />
        <CommandBlock
          label={copy.linuxShell}
          value={LINUX_COMMANDS}
          copyLabel={copy.copyButton}
          copiedLabel={copy.copiedLabel}
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowFullGuide(true)}
            className="rounded-lg bg-line/50 px-3 py-1.5 text-xs font-medium text-studio-foreground transition-colors hover:bg-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {copy.fullGuideButton}
          </button>
          <button
            type="button"
            onClick={() => openExternalLink("engineSource")}
            className="text-xs text-muted underline underline-offset-2 transition-colors hover:text-studio-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {copy.sourceButton}
          </button>
          <button
            type="button"
            onClick={() => openExternalLink("ggufSource")}
            className="text-xs text-muted underline underline-offset-2 transition-colors hover:text-studio-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {copy.modelsButton}
          </button>
        </div>
      </div>
    </details>
  );
}
