# Voice of Fish Bilingual Setup Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bilingual Windows/Linux setup guide inside onboarding so users can build `s2.cpp`, download compatible GGUF files, select the binary and model, and configure output without automatic shell execution.

**Architecture:** Keep existing onboarding flow unchanged. Add guide-only copy in `i18n.ts`, render it through a focused `OnboardingInstallGuide` component with local Spanish/English and quick/full state, then compose that component into `OnboardingEngineStep`. Reuse fixed `openExternalLink()` allowlist for repository actions.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Tailwind CSS, existing Tauri shell allowlist.

---

## File Structure

- Create: `apps/desktop/src/components/settings/OnboardingInstallGuide.tsx`
  - Own guide language and quick/full view state.
  - Render native disclosure, semantic lists, command blocks, and fixed repository actions.
- Create: `apps/desktop/src/components/settings/OnboardingInstallGuide.test.tsx`
  - Cover collapsed state, language change, full local view, back navigation, and external key allowlist use.
- Create: `apps/desktop/src/lib/i18n.test.ts`
  - Cover bilingual guide catalog and preserve existing `t()` behavior.
- Modify: `apps/desktop/src/lib/i18n.ts`
  - Add guide-specific Spanish/English catalog and typed accessor without changing existing English UI catalog.
- Modify: `apps/desktop/src/components/settings/OnboardingEngineStep.tsx`
  - Compose guide below experimental badge and above binary input.
- Modify: `apps/desktop/src/components/layout/AppShell.test.tsx`
  - Add one integration assertion proving incomplete onboarding exposes setup help.

## Known Baseline Blockers

Do not fold these into feature commits unless implementation proves direct dependency:

- `pnpm --filter @voice-of-fish/desktop test` currently has one unrelated `SetupPanel.test.tsx` expectation mismatch: Linux expected models path while jsdom returns Windows defaults.
- `pnpm --filter @voice-of-fish/desktop build:web` currently fails because dirty `apps/desktop/vite.config.ts` adds unsupported top-level `watch`.
- Windows `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml` currently fails because an existing Rust test imports `std::os::unix::fs::PermissionsExt` without `#[cfg(unix)]`.

---

### Task 1: Add Typed Bilingual Guide Catalog

**Files:**
- Create: `apps/desktop/src/lib/i18n.test.ts`
- Modify: `apps/desktop/src/lib/i18n.ts`

- [ ] **Step 1: Write failing catalog tests**

Create `apps/desktop/src/lib/i18n.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getGuideMessages, t } from "./i18n";

describe("getGuideMessages", () => {
  it("serves Spanish setup guide copy by default-compatible key", () => {
    const copy = getGuideMessages("es");

    expect(copy.quickSummary).toMatch(/Necesitas instalar s2\.cpp/i);
    expect(copy.fullGuideButton).toBe("Abrir guía completa");
    expect(copy.quickSteps).toHaveLength(5);
  });

  it("serves English setup guide copy", () => {
    const copy = getGuideMessages("en");

    expect(copy.quickSummary).toMatch(/Need to install s2\.cpp/i);
    expect(copy.fullGuideButton).toBe("Open full guide");
    expect(copy.quickSteps).toHaveLength(5);
  });

  it("keeps existing application translations available", () => {
    expect(t("engineHeading")).toBe("Connect s2.cpp");
  });
});
```

- [ ] **Step 2: Run catalog tests and verify red**

Run:

```sh
pnpm exec vitest run src/lib/i18n.test.ts
```

Expected: FAIL because `getGuideMessages` is not exported.

- [ ] **Step 3: Add typed guide catalog**

Append this block after the existing `t()` function in `apps/desktop/src/lib/i18n.ts`:

```ts
export type GuideLanguage = "es" | "en";

const guideMessages = {
  es: {
    languageLabel: "Idioma de la guía",
    spanish: "Español",
    english: "English",
    quickSummary: "¿Necesitas instalar s2.cpp? Ver guía rápida",
    quickIntro:
      "Voice of Fish no instala s2.cpp. Usa estos pasos para preparar el motor y los archivos del modelo localmente.",
    quickSteps: [
      "Instala Git, CMake y un compilador compatible con C++17. Vulkan es opcional, pero recomendado para usar GPU.",
      "Clona s2.cpp con sus submódulos.",
      "Compila el binario Release para tu sistema.",
      "Instala la CLI hf y descarga un modelo GGUF compatible junto con tokenizer.json.",
      "Vuelve a Voice of Fish: elige el binario, el archivo GGUF y la carpeta de salida.",
    ],
    windowsPowerShell: "Windows PowerShell",
    linuxShell: "Linux shell",
    fullGuideButton: "Abrir guía completa",
    sourceButton: "Abrir repositorio s2.cpp",
    modelsButton: "Abrir modelos GGUF",
    backButton: "Volver a configuración",
    fullGuideHeading: "Guía completa de instalación",
    communityHeading: "Motor comunitario y experimental",
    communityBody:
      "s2.cpp es un proyecto comunitario experimental. Voice of Fish solo lo controla localmente: no instala dependencias ni ejecuta comandos de instalación.",
    windowsHeading: "Windows",
    windowsBody:
      "Instala Git, CMake y Visual Studio Build Tools con soporte para C++. Abre PowerShell y ejecuta:",
    linuxHeading: "Linux",
    linuxBody:
      "Instala Git, CMake y tu toolchain C++17 desde el gestor de paquetes de tu distribución. Abre una terminal y ejecuta:",
    modelHeading: "Descargar modelo GGUF y tokenizer",
    modelBody:
      "Instala la CLI actual de Hugging Face y descarga Q6 junto con tokenizer.json. Puedes elegir Q8, Q5 o Q4 según memoria disponible.",
    binaryLocationsHeading: "Ubicaciones típicas del binario",
    binaryLocations: [
      "Windows: build\\Release\\s2.exe o build\\s2.exe",
      "Linux: build/s2",
    ],
    requiredFilesHeading: "Archivos requeridos",
    requiredFiles: [
      "Un GGUF compatible: Q8, Q6, Q5 o Q4.",
      "tokenizer.json en la carpeta de modelos elegida.",
    ],
    returnHeading: "Volver a Voice of Fish",
    returnSteps: [
      "Elige el binario compilado.",
      "Elige el archivo GGUF compatible.",
      "Elige una carpeta de salida.",
      "Finaliza la configuración.",
    ],
    troubleshootingHeading: "Solución de problemas",
    troubleshootingSteps: [
      "Binary missing: verifica que la ruta elegida apunte al archivo compilado.",
      "Linux rechaza el ejecutable: ejecuta chmod +x build/s2.",
      "Vulkan no está disponible: recompila sin -DS2_VULKAN=ON.",
      "Modelo rechazado: elige GGUF Q8, Q6, Q5 o Q4; no uses Safetensors ni F16.",
    ],
  },
  en: {
    languageLabel: "Guide language",
    spanish: "Español",
    english: "English",
    quickSummary: "Need to install s2.cpp? View quick guide",
    quickIntro:
      "Voice of Fish does not install s2.cpp. Use these steps to prepare the engine and local model files.",
    quickSteps: [
      "Install Git, CMake, and a C++17-compatible compiler. Vulkan is optional but recommended for GPU execution.",
      "Clone s2.cpp with its submodules.",
      "Build the Release binary for your system.",
      "Install the hf CLI and download a compatible GGUF model together with tokenizer.json.",
      "Return to Voice of Fish: choose the binary, GGUF file, and output folder.",
    ],
    windowsPowerShell: "Windows PowerShell",
    linuxShell: "Linux shell",
    fullGuideButton: "Open full guide",
    sourceButton: "Open s2.cpp repository",
    modelsButton: "Open GGUF models",
    backButton: "Back to setup",
    fullGuideHeading: "Complete installation guide",
    communityHeading: "Community and experimental engine",
    communityBody:
      "s2.cpp is an experimental community project. Voice of Fish only controls it locally: it does not install dependencies or execute installation commands.",
    windowsHeading: "Windows",
    windowsBody:
      "Install Git, CMake, and Visual Studio Build Tools with C++ support. Open PowerShell and run:",
    linuxHeading: "Linux",
    linuxBody:
      "Install Git, CMake, and your C++17 toolchain from your distribution package manager. Open a terminal and run:",
    modelHeading: "Download GGUF model and tokenizer",
    modelBody:
      "Install the current Hugging Face CLI and download Q6 together with tokenizer.json. You can choose Q8, Q5, or Q4 based on available memory.",
    binaryLocationsHeading: "Typical binary locations",
    binaryLocations: [
      "Windows: build\\Release\\s2.exe or build\\s2.exe",
      "Linux: build/s2",
    ],
    requiredFilesHeading: "Required files",
    requiredFiles: [
      "One compatible GGUF file: Q8, Q6, Q5, or Q4.",
      "tokenizer.json in the selected models folder.",
    ],
    returnHeading: "Return to Voice of Fish",
    returnSteps: [
      "Choose the built binary.",
      "Choose the compatible GGUF file.",
      "Choose an output folder.",
      "Finish setup.",
    ],
    troubleshootingHeading: "Troubleshooting",
    troubleshootingSteps: [
      "Binary missing: verify that the selected path points to the built file.",
      "Linux rejects the executable: run chmod +x build/s2.",
      "Vulkan is unavailable: rebuild without -DS2_VULKAN=ON.",
      "Model rejected: choose GGUF Q8, Q6, Q5, or Q4; do not use Safetensors or F16.",
    ],
  },
} as const;

export function getGuideMessages(language: GuideLanguage) {
  return guideMessages[language];
}
```

- [ ] **Step 4: Run catalog tests and verify green**

Run:

```sh
pnpm exec vitest run src/lib/i18n.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit catalog**

```sh
git add apps/desktop/src/lib/i18n.ts apps/desktop/src/lib/i18n.test.ts
git commit -m "feat(onboarding): add bilingual setup guide copy"
```

---

### Task 2: Build Quick Guide Disclosure

**Files:**
- Create: `apps/desktop/src/components/settings/OnboardingInstallGuide.tsx`
- Create: `apps/desktop/src/components/settings/OnboardingInstallGuide.test.tsx`

- [ ] **Step 1: Write failing quick-guide tests**

Create `apps/desktop/src/components/settings/OnboardingInstallGuide.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { OnboardingInstallGuide } from "./OnboardingInstallGuide";

const mockOpenExternalLink = vi.fn();

vi.mock("@/lib/tauri", () => ({
  openExternalLink: (...args: unknown[]) => mockOpenExternalLink(...args),
}));

describe("OnboardingInstallGuide", () => {
  it("starts collapsed with Spanish quick-guide trigger", () => {
    render(<OnboardingInstallGuide />);

    const details = screen.getByText(/Necesitas instalar s2\.cpp/i).closest("details");
    expect(details).not.toHaveAttribute("open");
  });

  it("opens quick guide and switches to English", async () => {
    const user = userEvent.setup();
    render(<OnboardingInstallGuide />);

    await user.click(screen.getByText(/Necesitas instalar s2\.cpp/i));
    expect(screen.getByText(/Voice of Fish no instala s2\.cpp/i)).toBeVisible();
    expect(screen.getByText("Windows PowerShell")).toBeVisible();
    expect(screen.getByText("Linux shell")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByText(/Voice of Fish does not install s2\.cpp/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run component tests and verify red**

Run:

```sh
pnpm exec vitest run src/components/settings/OnboardingInstallGuide.test.tsx
```

Expected: FAIL because `OnboardingInstallGuide.tsx` does not exist.

- [ ] **Step 3: Implement quick disclosure**

Create `apps/desktop/src/components/settings/OnboardingInstallGuide.tsx`:

```tsx
import { useState } from "react";
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

function CommandBlock({ label, value }: { label: string; value: string }) {
  return (
    <section className="space-y-1">
      <h4 className="text-xs font-semibold text-studio-foreground">{label}</h4>
      <pre className="overflow-x-auto rounded-md border border-line bg-studio p-3 text-[11px] leading-relaxed text-muted">
        <code>{value}</code>
      </pre>
    </section>
  );
}

export function OnboardingInstallGuide() {
  const [language, setLanguage] = useState<GuideLanguage>("es");
  const copy = getGuideMessages(language);

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
        <CommandBlock label={copy.windowsPowerShell} value={WINDOWS_COMMANDS} />
        <CommandBlock label={copy.linuxShell} value={LINUX_COMMANDS} />
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
      </div>
    </details>
  );
}
```

- [ ] **Step 4: Run component tests and verify green**

Run:

```sh
pnpm exec vitest run src/components/settings/OnboardingInstallGuide.test.tsx
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit quick guide**

```sh
git add apps/desktop/src/components/settings/OnboardingInstallGuide.tsx apps/desktop/src/components/settings/OnboardingInstallGuide.test.tsx
git commit -m "feat(onboarding): add bilingual quick setup guide"
```

---

### Task 3: Add Full Local Guide View

**Files:**
- Modify: `apps/desktop/src/components/settings/OnboardingInstallGuide.tsx`
- Modify: `apps/desktop/src/components/settings/OnboardingInstallGuide.test.tsx`

- [ ] **Step 1: Add failing full-view and external-action tests**

Append inside existing `describe()` in `apps/desktop/src/components/settings/OnboardingInstallGuide.test.tsx`:

```tsx
  it("opens full local guide and returns to setup help", async () => {
    const user = userEvent.setup();
    render(<OnboardingInstallGuide />);

    await user.click(screen.getByText(/Necesitas instalar s2\.cpp/i));
    await user.click(screen.getByRole("button", { name: /Abrir guía completa/i }));

    expect(
      screen.getByRole("heading", { name: /Guía completa de instalación/i }),
    ).toBeVisible();
    expect(screen.getByText(/build\\Release\\s2\.exe/i)).toBeVisible();
    expect(screen.getByText(/chmod \+x build\/s2/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Volver a configuración/i }));
    expect(screen.getByText(/Necesitas instalar s2\.cpp/i)).toBeVisible();
  });

  it("opens only fixed repository actions", async () => {
    const user = userEvent.setup();
    render(<OnboardingInstallGuide />);

    await user.click(screen.getByText(/Necesitas instalar s2\.cpp/i));
    await user.click(screen.getByRole("button", { name: /Abrir repositorio s2\.cpp/i }));
    await user.click(screen.getByRole("button", { name: /Abrir modelos GGUF/i }));

    expect(mockOpenExternalLink).toHaveBeenNthCalledWith(1, "engineSource");
    expect(mockOpenExternalLink).toHaveBeenNthCalledWith(2, "ggufSource");
  });
```

Add reset at top of existing `describe()`:

```tsx
  beforeEach(() => {
    vi.clearAllMocks();
  });
```

Update import:

```tsx
import { beforeEach, vi } from "vitest";
```

- [ ] **Step 2: Run component tests and verify red**

Run:

```sh
pnpm exec vitest run src/components/settings/OnboardingInstallGuide.test.tsx
```

Expected: FAIL because `Abrir guía completa` does not exist.

- [ ] **Step 3: Add full local guide rendering**

In `apps/desktop/src/components/settings/OnboardingInstallGuide.tsx`, add helper after `CommandBlock`:

```tsx
function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
```

Inside `OnboardingInstallGuide()`, add state:

```tsx
  const [showFullGuide, setShowFullGuide] = useState(false);
```

Before current quick-guide `return`, add:

```tsx
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
          <p className="text-xs leading-relaxed text-muted">{copy.communityBody}</p>
        </section>

        <section className="space-y-2">
          <h4 className="text-sm font-semibold">{copy.windowsHeading}</h4>
          <p className="text-xs leading-relaxed text-muted">{copy.windowsBody}</p>
          <CommandBlock label={copy.windowsPowerShell} value={WINDOWS_COMMANDS} />
        </section>

        <section className="space-y-2">
          <h4 className="text-sm font-semibold">{copy.linuxHeading}</h4>
          <p className="text-xs leading-relaxed text-muted">{copy.linuxBody}</p>
          <CommandBlock label={copy.linuxShell} value={LINUX_COMMANDS} />
        </section>

        <section className="space-y-1">
          <h4 className="text-sm font-semibold">{copy.modelHeading}</h4>
          <p className="text-xs leading-relaxed text-muted">{copy.modelBody}</p>
        </section>

        <section className="space-y-1">
          <h4 className="text-sm font-semibold">{copy.binaryLocationsHeading}</h4>
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
          <h4 className="text-sm font-semibold">{copy.troubleshootingHeading}</h4>
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
```

Inside quick-guide action `<div className="flex flex-wrap gap-3">`, insert first:

```tsx
          <button
            type="button"
            onClick={() => setShowFullGuide(true)}
            className="rounded-lg bg-line/50 px-3 py-1.5 text-xs font-medium text-studio-foreground transition-colors hover:bg-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {copy.fullGuideButton}
          </button>
```

- [ ] **Step 4: Run component tests and verify green**

Run:

```sh
pnpm exec vitest run src/components/settings/OnboardingInstallGuide.test.tsx
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit full local guide**

```sh
git add apps/desktop/src/components/settings/OnboardingInstallGuide.tsx apps/desktop/src/components/settings/OnboardingInstallGuide.test.tsx
git commit -m "feat(onboarding): add full local installation guide"
```

---

### Task 4: Compose Guide Into Engine Step

**Files:**
- Modify: `apps/desktop/src/components/settings/OnboardingEngineStep.tsx`
- Modify: `apps/desktop/src/components/layout/AppShell.test.tsx`

- [ ] **Step 1: Add failing onboarding integration assertion**

In `apps/desktop/src/components/layout/AppShell.test.tsx`, inside test `keeps setup incomplete when persisted config has no binaryPath`, add after existing engine body assertion:

```tsx
    expect(
      screen.getByText(/Necesitas instalar s2\.cpp/i),
    ).toBeVisible();
```

- [ ] **Step 2: Run integration test and verify red**

Run:

```sh
pnpm exec vitest run src/components/layout/AppShell.test.tsx
```

Expected: FAIL because engine step does not render quick-guide trigger.

- [ ] **Step 3: Compose guide**

In `apps/desktop/src/components/settings/OnboardingEngineStep.tsx`, add import:

```tsx
import { OnboardingInstallGuide } from "./OnboardingInstallGuide";
```

After existing community badge and before `{/* Binary path */}`, insert:

```tsx
      <OnboardingInstallGuide />
```

- [ ] **Step 4: Run guide and integration tests**

Run:

```sh
pnpm exec vitest run src/components/settings/OnboardingInstallGuide.test.tsx src/components/layout/AppShell.test.tsx
```

Expected: PASS, 11 tests.

- [ ] **Step 5: Run lint and focused format check**

Run:

```sh
pnpm --filter @voice-of-fish/desktop lint
pnpm exec prettier --check src/lib/i18n.ts src/lib/i18n.test.ts src/components/settings/OnboardingInstallGuide.tsx src/components/settings/OnboardingInstallGuide.test.tsx src/components/settings/OnboardingEngineStep.tsx src/components/layout/AppShell.test.tsx
```

Expected: PASS. If Prettier reports files, run same paths with `--write`, then repeat `--check`.

- [ ] **Step 6: Commit integration**

```sh
git add apps/desktop/src/components/settings/OnboardingEngineStep.tsx apps/desktop/src/components/layout/AppShell.test.tsx
git commit -m "feat(onboarding): expose installation guide in engine step"
```

---

### Task 5: Verify Feature And Report Existing Blockers

**Files:**
- No production edits expected.

- [ ] **Step 1: Run focused feature tests**

Run:

```sh
pnpm exec vitest run src/lib/i18n.test.ts src/components/settings/OnboardingInstallGuide.test.tsx src/components/layout/AppShell.test.tsx
```

Expected: PASS, 14 tests.

- [ ] **Step 2: Run desktop lint**

Run:

```sh
pnpm --filter @voice-of-fish/desktop lint
```

Expected: PASS.

- [ ] **Step 3: Run focused formatting and diff checks**

Run:

```sh
pnpm exec prettier --check src/lib/i18n.ts src/lib/i18n.test.ts src/components/settings/OnboardingInstallGuide.tsx src/components/settings/OnboardingInstallGuide.test.tsx src/components/settings/OnboardingEngineStep.tsx src/components/layout/AppShell.test.tsx
git diff --check
```

Expected: PASS for changed feature files. If `git diff --check` reports pre-existing dirty files outside feature scope, report them separately.

- [ ] **Step 4: Run broad frontend tests**

Run:

```sh
pnpm --filter @voice-of-fish/desktop test
```

Expected: feature tests PASS. Existing unrelated `SetupPanel.test.tsx` models-path mismatch may remain; report exact output without editing it in this feature.

- [ ] **Step 5: Run web build**

Run:

```sh
pnpm --filter @voice-of-fish/desktop build:web
```

Expected: existing unrelated `vite.config.ts` top-level `watch` error may remain; report exact output without editing it in this feature.

- [ ] **Step 6: Run manual desktop QA when Tauri dev app is available**

Run:

```sh
pnpm --filter @voice-of-fish/desktop tauri dev
```

Verify:

1. Empty or missing binary keeps onboarding visible.
2. `¿Necesitas instalar s2.cpp? Ver guía rápida` starts collapsed.
3. Disclosure opens with Spanish steps and both platform command blocks.
4. `English` switches visible guide copy.
5. Full guide opens locally and returns to setup.
6. Repository buttons open only fixed `s2.cpp` and GGUF URLs.
7. Binary picker and existing validation still work.

If Tauri dev cannot run because environment prerequisites or unrelated dirty configuration block startup, report exact blocker.

- [ ] **Step 7: Review commit scope**

Run:

```sh
git status --short
git log --oneline -8
```

Expected: feature commits contain only planned files. Existing user changes remain untouched.
