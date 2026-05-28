import { AppProviders } from "./providers";
import { AppRoutes } from "./routes";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export function App() {
  return (
    <AppProviders>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </AppProviders>
  );
}