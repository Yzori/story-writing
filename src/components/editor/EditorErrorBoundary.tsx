"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class EditorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-rose-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-lg font-display text-paper mb-2">Editor ran into a problem</h3>
            <p className="text-sm text-text-secondary mb-4">
              Your work has been auto-saved. Try reloading the editor.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  this.props.onReset?.();
                }}
                className="px-4 py-2 rounded-lg bg-amber/10 border border-amber/20 text-amber text-sm hover:bg-amber/20 transition-colors"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-surface border border-border text-text-secondary text-sm hover:text-paper transition-colors"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
