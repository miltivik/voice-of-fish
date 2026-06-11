import { AppProviders } from "./providers";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { AppRoutes } from "./routes";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export function App() {
  useKeyboardShortcuts();
  return (
    <AppProviders>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </AppProviders>
  );
}