"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface SortableItem {
  id: string;
  title: ReactNode;
  description?: ReactNode;
}

export function SortableList({
  items,
  onReorder,
  renderActions,
  className,
}: {
  items: SortableItem[];
  onReorder?: (items: SortableItem[]) => void;
  renderActions?: (item: SortableItem) => ReactNode;
  className?: string;
}) {
  const [orderedItems, setOrderedItems] = useState(items);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  function commit(nextItems: SortableItem[]) {
    setOrderedItems(nextItems);
    onReorder?.(nextItems);
  }

  function move(index: number, nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= orderedItems.length) return;
    const nextItems = [...orderedItems];
    const [item] = nextItems.splice(index, 1);
    nextItems.splice(nextIndex, 0, item);
    commit(nextItems);
  }

  function drop(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    const from = orderedItems.findIndex((item) => item.id === draggedId);
    const to = orderedItems.findIndex((item) => item.id === targetId);
    if (from === -1 || to === -1) return;
    move(from, to);
    setDraggedId(null);
  }

  return (
    <ol className={cn("divide-y divide-scouts-grey border-y border-scouts-grey", className)}>
      {orderedItems.map((item, index) => (
        <li
          key={item.id}
          draggable
          onDragStart={() => setDraggedId(item.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => drop(item.id)}
          className="grid gap-3 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-center"
        >
          <span className="hidden cursor-grab text-xl text-scouts-grey-dark sm:inline" aria-hidden>
            ⠿
          </span>
          <div className="min-w-0">
            <h3 className="font-bold text-black">{item.title}</h3>
            {item.description ? <p className="mt-1 text-sm text-scouts-grey-dark">{item.description}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {renderActions?.(item)}
            <button
              type="button"
              onClick={() => move(index, index - 1)}
              disabled={index === 0}
              aria-label={`Move ${String(item.title)} up`}
              className="border-2 border-black px-2 py-1 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(index, index + 1)}
              disabled={index === orderedItems.length - 1}
              aria-label={`Move ${String(item.title)} down`}
              className="border-2 border-black px-2 py-1 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↓
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}
