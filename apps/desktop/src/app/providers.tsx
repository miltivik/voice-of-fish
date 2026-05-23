import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { HashRouter } from "react-router-dom";
import { Toaster } from "sonner";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        {children}
        <Toaster
          closeButton
          richColors
          theme="dark"
          toastOptions={{
            classNames: {
              toast: "border-line bg-panel text-studio-foreground",
            },
          }}
        />
      </HashRouter>
    </QueryClientProvider>
  );
}
