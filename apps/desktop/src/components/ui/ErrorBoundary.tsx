import { Component } from "react";
import { Link } from "react-router-dom";

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center px-6">
          <div className="max-w-md space-y-4 text-center">
            <h2 className="text-lg font-semibold text-studio-foreground">
              Something went wrong
            </h2>
            <p className="text-sm text-muted">
              An unexpected error occurred on this page. You can try going back
              to the dashboard and navigating again.
            </p>
            <Link
              to="/"
              className="inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-studio transition-colors hover:bg-accent/80"
              onClick={() => this.setState({ error: null })}
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
