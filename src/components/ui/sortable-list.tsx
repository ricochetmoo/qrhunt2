"use client";

import { useMemo, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

type DropPosition = "before" | "after";

interface DropTarget {
  id: string;
  position: DropPosition;
}

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
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  // Keep the local drag order in sync with server refreshes and optimistic rollbacks.
  if (itemIdsKey !== lastItemIdsKey) {
    setLastItemIdsKey(itemIdsKey);
    setOrderedIds(itemIds);
    setDraggedId(null);
    setDropTarget(null);
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

  function drop(targetId: string, position: DropPosition) {
    if (disabled || !draggedId || draggedId === targetId) return;
    const from = orderedItems.findIndex((item) => item.id === draggedId);
    let to = orderedItems.findIndex((item) => item.id === targetId);
    if (from === -1 || to === -1) return;
    if (position === "after") to += 1;
    if (from < to) to -= 1;
    move(from, to);
    setDraggedId(null);
    setDropTarget(null);
  }

  return (
    <ol className={cn("divide-y divide-scouts-border-muted border-y border-scouts-border-muted", className)}>
      {orderedItems.map((item) => (
        <li
          key={item.id}
          draggable={!disabled}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            setDraggedId(item.id);
            setDropTarget(null);
          }}
          onDragOver={(event) => {
            if (disabled || draggedId === item.id) {
              setDropTarget(null);
              return;
            }

            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            const bounds = event.currentTarget.getBoundingClientRect();
            const position = event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
            setDropTarget({ id: item.id, position });
          }}
          onDragLeave={(event) => {
            const relatedTarget = event.relatedTarget;
            if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
              setDropTarget(null);
            }
          }}
          onDrop={() => drop(item.id, dropTarget?.id === item.id ? dropTarget.position : "before")}
          onDragEnd={() => {
            setDraggedId(null);
            setDropTarget(null);
          }}
          className={cn(
            "relative grid gap-3 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-center",
            item.id === draggedId && "opacity-45",
            dropTarget?.id === item.id && dropTarget.position === "before" && "border-t-4 border-scouts-primary",
            dropTarget?.id === item.id && dropTarget.position === "after" && "border-b-4 border-scouts-primary",
          )}
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
