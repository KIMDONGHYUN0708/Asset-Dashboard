'use client';
import { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export default function SettingsShell({ title, description, action, children }: Props) {
  return (
    <div className="rounded-2xl bg-th-card border border-th-border overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-th-border">
        <div>
          <h2 className="text-base font-semibold text-th-text">{title}</h2>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export function FormRow({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <div className="flex items-start gap-4">
      <label className="w-32 flex-shrink-0 pt-2.5 text-sm text-slate-400">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-th-muted border border-th-border text-th-text text-sm rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder:text-slate-600 transition-colors ${props.className ?? ''}`}
    />
  );
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full bg-th-muted border border-th-border text-th-text text-sm rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors ${props.className ?? ''}`}
    >
      {children}
    </select>
  );
}

export function SaveButton({ onClick, label = '저장' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-th-text text-sm font-medium rounded-lg transition-colors"
    >
      {label}
    </button>
  );
}

export function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
      title="삭제"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
      </svg>
    </button>
  );
}
