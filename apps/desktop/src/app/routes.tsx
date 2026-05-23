import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { DiagnosticsPage } from "@/features/diagnostics/DiagnosticsPage";
import { GenerationPage } from "@/features/generation/GenerationPage";
import { HistoryPage } from "@/features/history/HistoryPage";
import { ModelManagerPage } from "@/features/model-manager/ModelManagerPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { VoiceCloningPage } from "@/features/voice-cloning/VoiceCloningPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="generate" element={<GenerationPage />} />
        <Route path="voices" element={<VoiceCloningPage />} />
        <Route path="models" element={<ModelManagerPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="diagnostics" element={<DiagnosticsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
