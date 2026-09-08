"use client";

import { useMemo, useState, type ReactNode } from "react";

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
  disabled = false,
}: {
  items: SortableItem[];
  onReorder?: (items: SortableItem[]) => void;
  renderActions?: (item: SortableItem) => ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const itemIds = items.map((item) => item.id);
  const itemIdsKey = itemIds.join("\u0000");
  const [orderedIds, setOrderedIds] = useState(itemIds);
  const [lastItemIdsKey, setLastItemIdsKey] = useState(itemIdsKey);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Keep the local drag order in sync with server refreshes and optimistic rollbacks.
  if (itemIdsKey !== lastItemIdsKey) {
    setLastItemIdsKey(itemIdsKey);
    setOrderedIds(itemIds);
    setDraggedId(null);
  }

  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const orderedItems = orderedIds
    .map((id) => itemsById.get(id))
    .filter((item): item is SortableItem => item !== undefined);

  function commit(nextItems: SortableItem[]) {
    setOrderedIds(nextItems.map((item) => item.id));
    onReorder?.(nextItems);
  }

  function move(index: number, nextIndex: number) {
    if (disabled || nextIndex < 0 || nextIndex >= orderedItems.length) return;
    const nextItems = [...orderedItems];
    const [item] = nextItems.splice(index, 1);
    nextItems.splice(nextIndex, 0, item);
    commit(nextItems);
  }

  function drop(targetId: string) {
    if (disabled || !draggedId || draggedId === targetId) return;
    const from = orderedItems.findIndex((item) => item.id === draggedId);
    const to = orderedItems.findIndex((item) => item.id === targetId);
    if (from === -1 || to === -1) return;
    move(from, to);
    setDraggedId(null);
  }

  return (
    <ol className={cn("divide-y divide-scouts-border-muted border-y border-scouts-border-muted", className)}>
      {orderedItems.map((item) => (
        <li
          key={item.id}
          draggable={!disabled}
          onDragStart={() => setDraggedId(item.id)}
          onDragOver={(event) => {
            if (!disabled) event.preventDefault();
          }}
          onDrop={() => drop(item.id)}
          className="grid gap-3 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-center"
        >
          <span className="hidden cursor-grab text-xl text-scouts-muted sm:inline" aria-hidden>
            ⠿
          </span>
          <div className="min-w-0">
            <h3 className="font-bold text-scouts-text">{item.title}</h3>
            {item.description ? <p className="mt-1 text-sm text-scouts-muted">{item.description}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {renderActions?.(item)}
          </div>
        </li>
      ))}
    </ol>
  );
}
