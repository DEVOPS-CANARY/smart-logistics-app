"use client";

import { Component, ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-xl px-6 py-20 text-center">
          <h2 className="text-2xl font-semibold text-stone-900">
            Something went wrong
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            An unexpected error occurred. You can try again or return to the
            home page.
          </p>
          {this.state.error && (
            <pre className="mt-4 rounded-lg bg-stone-100 p-4 text-left text-xs text-stone-700 overflow-auto max-h-40">
              {this.state.error.message}
            </pre>
          )}
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
            >
              Try again
            </button>
            {/* A full page load on purpose: after a crash it discards the
                broken client state, which client-side <Link> navigation keeps. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Go home
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
