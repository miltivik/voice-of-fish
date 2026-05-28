import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center bg-studio text-studio-foreground">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.hash = "#/";
              }}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-studio transition-colors hover:bg-accent/80"
            >
              Reload
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}