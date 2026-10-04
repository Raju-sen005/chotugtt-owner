import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error("UI crash:", error, info);
    }
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--background)] px-6 text-center">
          <p className="text-lg font-black text-slate-900">Something went wrong</p>
          <p className="max-w-sm text-sm text-slate-500">
            Reload the page. Your session cookie is safe — you will stay signed in.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--primary-dark)]"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
