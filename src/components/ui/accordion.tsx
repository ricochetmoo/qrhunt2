"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface AccordionItemData {
  id: string;
  title: string;
  content: ReactNode;
  summary?: ReactNode;
}

export function Accordion({
  items,
  defaultOpen = [],
  multiple = false,
  showAll = true,
  className,
}: {
  items: AccordionItemData[];
  defaultOpen?: string[];
  multiple?: boolean;
  showAll?: boolean;
  className?: string;
}) {
  const [openItems, setOpenItems] = useState<Set<string>>(() => new Set(defaultOpen));
  const allOpen = items.length > 0 && items.every((item) => openItems.has(item.id));

  function toggle(id: string) {
    setOpenItems((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else if (multiple) {
        next.add(id);
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    setOpenItems(allOpen ? new Set() : new Set(items.map((item) => item.id)));
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showAll && items.length > 1 ? (
        <button
          type="button"
          onClick={toggleAll}
          className="mb-2 font-bold text-scouts-purple underline decoration-2 underline-offset-2 hover:text-scouts-purple-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-scouts-purple"
        >
          {allOpen ? "Hide all" : "Show all"}
        </button>
      ) : null}
      {items.map((item) => {
        const open = openItems.has(item.id);
        return (
          <section key={item.id} className="border-b border-scouts-grey">
            <h3 className="m-0">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => toggle(item.id)}
                className="flex w-full items-center justify-between gap-4 py-4 text-left text-xl font-extrabold focus:outline-none focus-visible:ring-2 focus-visible:ring-scouts-purple"
              >
                <span>{item.title}</span>
                <span className={cn("text-scouts-purple transition-transform", open && "rotate-180")} aria-hidden>
                  ↓
                </span>
              </button>
            </h3>
            {open ? (
              <div className="pb-5">
                {item.summary ? <p className="mb-2 text-sm text-scouts-grey-dark">{item.summary}</p> : null}
                {item.content}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
