import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export const fieldClasses =
  "block w-full border-2 border-black bg-white px-2 py-2 text-base text-black placeholder:text-scouts-grey-dark focus:border-scouts-purple focus:outline-none focus:ring-2 focus:ring-scouts-purple/25 disabled:bg-scouts-grey-light disabled:text-scouts-grey-dark";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClasses, "min-h-24", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldClasses, "appearance-auto", className)} {...props} />;
}
