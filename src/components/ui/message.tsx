"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export type MessageVariant = "success" | "info" | "warning" | "danger";

const MESSAGE_CLASSES: Record<MessageVariant, string> = {
  success: "bg-scouts-green-light",
  info: "bg-scouts-blue-light",
  warning: "bg-scouts-orange-light",
  danger: "bg-scouts-red-light",
};

const MESSAGE_ACCENTS: Record<MessageVariant, string> = {
  success: "border-scouts-green",
  info: "border-scouts-blue",
  warning: "border-scouts-orange",
  danger: "border-scouts-red",
};

export function Message({
  title,
  children,
  variant = "info",
  dismissible = false,
  className,
}: {
  title: string;
  children: ReactNode;
  variant?: MessageVariant;
  dismissible?: boolean;
  className?: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      role={variant === "danger" ? "alert" : "region"}
      aria-label={title}
      className={cn("relative border-l-4 px-5 py-4 text-black", MESSAGE_CLASSES[variant], MESSAGE_ACCENTS[variant], className)}
    >
      <div className="pr-10">
        <h3 className="text-lg font-extrabold">{title}</h3>
        <div className="mt-1">{children}</div>
      </div>
      {dismissible ? (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={`Dismiss ${title}`}
          className="absolute right-3 top-3 p-1 text-xl leading-none hover:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
