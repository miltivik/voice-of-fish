import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const DashboardPage = lazy(() =>
  import("@/features/dashboard/DashboardPage").then((m) => ({
    default: m.DashboardPage,
  })),
);
const DiagnosticsPage = lazy(() =>
  import("@/features/diagnostics/DiagnosticsPage").then((m) => ({
    default: m.DiagnosticsPage,
  })),
);
const EditorPage = lazy(() =>
  import("@/features/editor/EditorPage").then((m) => ({
    default: m.EditorPage,
  })),
);
const GenerationPage = lazy(() =>
  import("@/features/generation/GenerationPage").then((m) => ({
    default: m.GenerationPage,
  })),
);
const HistoryPage = lazy(() =>
  import("@/features/history/HistoryPage").then((m) => ({
    default: m.HistoryPage,
  })),
);
const ModelManagerPage = lazy(() =>
  import("@/features/model-manager/ModelManagerPage").then((m) => ({
    default: m.ModelManagerPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@/features/settings/SettingsPage").then((m) => ({
    default: m.SettingsPage,
  })),
);
const VoiceCloningPage = lazy(() =>
  import("@/features/voice-cloning/VoiceCloningPage").then((m) => ({
    default: m.VoiceCloningPage,
  })),
);

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<PageShell><DashboardPage /></PageShell>} />
        <Route path="generate" element={<PageShell><GenerationPage /></PageShell>} />
        <Route path="editor" element={<PageShell><EditorPage /></PageShell>} />
        <Route path="voices" element={<PageShell><VoiceCloningPage /></PageShell>} />
        <Route path="models" element={<PageShell><ModelManagerPage /></PageShell>} />
        <Route path="history" element={<PageShell><HistoryPage /></PageShell>} />
        <Route path="settings" element={<PageShell><SettingsPage /></PageShell>} />
        <Route path="diagnostics" element={<PageShell><DiagnosticsPage /></PageShell>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
