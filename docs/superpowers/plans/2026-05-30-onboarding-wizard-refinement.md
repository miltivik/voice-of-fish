# Onboarding Wizard Refinement Plan

> Created: 2026-05-30
> Branch: feat/real-config-diagnostics
> Principle: KISS — simplest possible implementation, no overengineering

## Context

El wizard tiene 3 pasos (Engine → Model → Output) + guía bilingüe de instalación.
Tras la revisión, se identificaron 3 mejoras con impacto real y bajo esfuerzo.

## Tasks

### P0-A: Validación de binario en hydratación

**Problema**: Si el binario se borra/mueve después del setup, la app muestra el shell
principal pero la generación falla sin explicación.

**Fix**:
En `AppShell.tsx`, cuando `getAppConfig()` devuelve un config con `binaryPath` no vacío,
llamar a `checkBinaryExists(path)` ANTES de llamar a `hydrateConfig`.

```
useEffect → si persistedConfig?.binaryPath?.trim():
  1. checkBinaryExists(binaryPath)
  2. Si existe: hydrateConfig(config) → setupComplete = true
  3. Si no existe: hydrateConfig(config) → setupComplete = false
     Y mostrar el wizard con una advertencia
```

**Archivos a tocar**:
- `apps/desktop/src/components/layout/AppShell.tsx` (~20 líneas nuevas)
- `apps/desktop/src/components/layout/AppShell.test.tsx` (ya tiene mock listo)

**Principio KISS**: No crear un custom hook ni un store separado. Un `useEffect` con
un `try/catch` alcanza.

---

### P1-A: Comandos macOS en la guía de instalación

**Problema**: La guía solo tiene Windows y Linux. macOS usa CMake, Git, y Homebrew.

**Fix**:
Agregar variable `MACOS_COMMANDS` y secciones macOS en ambos modos (collapsed y expanded).
Agregar traducciones ES/EN para macOS.

**Archivos a tocar**:
- `apps/desktop/src/components/settings/OnboardingInstallGuide.tsx` (comandos + secciones)
- `apps/desktop/src/lib/i18n.ts` (`guideMessages.es` y `guideMessages.en`)
- `apps/desktop/src/components/settings/OnboardingInstallGuide.test.tsx` (1-2 tests)

**Comandos macOS**:
```bash
brew install cmake git
git clone --recurse-submodules https://github.com/rodrigomatta/s2.cpp.git
cd s2.cpp
cmake -B build -DCMAKE_BUILD_TYPE=Release -DS2_VULKAN=ON
cmake --build build --parallel $(sysctl -n hw.logicalcpu)
curl -LsSf https://hf.co/cli/install.sh | bash
hf download rodrigomt/s2-pro-gguf s2-pro-q6_k.gguf tokenizer.json --local-dir .
```

---

### P1-B: Validación consistente entre pasos

**Problema**: Los 3 pasos validan de forma inconsistente:
- Engine: onBlur (async)
- Model: inmediato al elegir archivo
- Output: onBlur solamente

**Fix mínimo**: Hacer que Output valide en `onChange` (como Model), no solo en `onBlur`.
Sin debounce — la validación es local (check de path no vacío), instantánea.

**Archivos a tocar**:
- `apps/desktop/src/components/settings/OnboardingOutputStep.tsx` (~5 líneas)

**Alternativa más compleja (NO implementar)**: Unificar los 3 pasos con un pattern común
de validación. Esto requeriría abstraer el comportamiento compartido — overengineering para
el estado actual del proyecto (3 componentes, lógica simple, sin repetición significativa).

## Constraints for all tasks

- **KISS**: La implementación más simple que resuelva el problema. Un hook por paso como
  máximo. Sin abstracciones compartidas innecesarias.
- **Seguridad**: `checkBinaryExists` es read-only (no ejecuta el binario). Los comandos
  son strings constantes (no user input). No hay risk surface nuevo.
- **Build**: Cada cambio debe compilar con `pnpm build` y pasar `pnpm test`.
- **Tests**: Agregar tests solo para el nuevo comportamiento. No testear defaults.
