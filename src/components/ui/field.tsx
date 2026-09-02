import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, required, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-base font-bold text-black">
        {label}
        {required ? <span className="ml-1 text-scouts-red" aria-hidden>*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-sm font-bold text-scouts-red" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-scouts-grey-dark">{hint}</p>
      ) : null}
    </div>
  );
}

export function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="border-l-4 border-scouts-red bg-scouts-red-light px-4 py-3 text-sm text-black"
    >
      {message}
    </div>
  );
}
