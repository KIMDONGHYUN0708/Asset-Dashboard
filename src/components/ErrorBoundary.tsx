'use client';
import React from 'react';

interface Props {
  children: React.ReactNode;
  label?: string;
}
interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl bg-slate-900 border border-red-500/20 p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-red-400 text-sm font-bold">!</span>
          </div>
          <div>
            <p className="text-sm font-medium text-red-400">
              {this.props.label ?? '컴포넌트'} 로딩 오류
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              페이지를 새로고침하거나 데이터를 확인해주세요.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
