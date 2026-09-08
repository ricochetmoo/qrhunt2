"use client";

import { useId, useState, type ReactNode } from "react";

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
  const accordionId = useId();
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
    <div className={cn("space-y-0", className)}>
      {showAll && items.length > 1 ? (
        <div className="border-b border-scouts-border-muted">
          <div className="flex justify-end">
            <button
              type="button"
              aria-expanded={allOpen}
              onClick={toggleAll}
              className="group flex cursor-pointer items-center px-1 py-1 text-xl font-bold text-scouts-link focus:outline-none focus-visible:ring-2 focus-visible:ring-scouts-focus"
            >
              <span
                className={cn(
                  "mr-3 h-2.5 w-2.5 rotate-45 border-r-2 border-b-2 border-black transition-transform",
                  allOpen && "-rotate-[135deg]",
                )}
                aria-hidden
              />
              <span className="underline decoration-2 underline-offset-2 group-focus-visible:bg-scouts-orange group-focus-visible:text-black">
                {allOpen ? "Hide all sections" : "Show all sections"}
              </span>
            </button>
          </div>
        </div>
      ) : null}
      <div className="border-b border-scouts-border-muted">
        {items.map((item) => {
          const open = openItems.has(item.id);
          const contentId = `${accordionId}-${item.id}-content`;
          return (
            <section key={item.id} className="border-t border-scouts-border-muted first:border-t-0">
              <h3 className="m-0">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={contentId}
                  onClick={() => toggle(item.id)}
                  className="group flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left text-2xl font-extrabold focus:outline-none focus-visible:ring-2 focus-visible:ring-scouts-focus"
                >
                  <span className="flex min-w-0 items-center gap-4">
                    <span
                      className={cn(
                        "h-3 w-3 shrink-0 rotate-45 border-r-2 border-b-2 border-black transition-transform",
                        open && "-rotate-[135deg]",
                      )}
                      aria-hidden
                    />
                    <span className="truncate font-black text-scouts-link underline decoration-2 underline-offset-2 group-focus-visible:bg-scouts-focus group-focus-visible:text-scouts-focus-text">
                      {item.title}
                    </span>
                  </span>
                  <span className="shrink-0 text-lg font-normal text-scouts-link">
                    {open ? "Hide" : "Show"}
                  </span>
                </button>
              </h3>
              {item.summary ? <p className="pb-4 text-lg text-scouts-text">{item.summary}</p> : null}
              {open ? (
                <div id={contentId} className="pb-6 pt-1">
                  {item.content}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
