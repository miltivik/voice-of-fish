import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";

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

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          index
          element={
            <Suspense fallback={<PageLoader />}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route
          path="generate"
          element={
            <Suspense fallback={<PageLoader />}>
              <GenerationPage />
            </Suspense>
          }
        />
        <Route
          path="voices"
          element={
            <Suspense fallback={<PageLoader />}>
              <VoiceCloningPage />
            </Suspense>
          }
        />
        <Route
          path="models"
          element={
            <Suspense fallback={<PageLoader />}>
              <ModelManagerPage />
            </Suspense>
          }
        />
        <Route
          path="history"
          element={
            <Suspense fallback={<PageLoader />}>
              <HistoryPage />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<PageLoader />}>
              <SettingsPage />
            </Suspense>
          }
        />
        <Route
          path="diagnostics"
          element={
            <Suspense fallback={<PageLoader />}>
              <DiagnosticsPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
