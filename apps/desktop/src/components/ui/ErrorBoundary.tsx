import { Component } from "react";
import { Link } from "react-router-dom";
import { t } from "@/lib/i18n";

export class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
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
              {t("errorBoundaryTitle")}
            </h2>
            <p className="text-sm text-muted">{t("errorBoundaryBody")}</p>
            <Link
              to="/"
              className="inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-studio transition-colors hover:bg-accent/80"
              onClick={() => this.setState({ error: null })}
            >
              {t("errorBoundaryAction")}
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
