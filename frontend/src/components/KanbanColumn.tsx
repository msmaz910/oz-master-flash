import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, Column } from "@/lib/kanban";
import { KanbanCard } from "@/components/KanbanCard";
import { NewCardForm } from "@/components/NewCardForm";

type KanbanColumnProps = {
  column: Column;
  cards: Card[];
  accent: string;
  onRename: (columnId: string, title: string) => void;
  onRenameBlur: (columnId: string) => void;
  onAddCard: (columnId: string, title: string, details: string) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
};

export const KanbanColumn = ({
  column,
  cards,
  accent,
  onRename,
  onRenameBlur,
  onAddCard,
  onDeleteCard,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        "flex h-full max-w-[420px] flex-1 flex-col overflow-hidden rounded-3xl border border-[var(--stroke)]",
        "bg-[var(--surface-strong)]/85 shadow-[var(--shadow-soft)] backdrop-blur transition",
        isOver && "border-transparent ring-2 ring-[var(--accent-yellow)]"
      )}
      // Floor scales with the board's own width (a container-query unit, not the
      // viewport) so columns resize continuously as the window is dragged, instead
      // of sitting pinned at a fixed px floor until the window crosses some huge
      // fixed threshold.
      style={{ minWidth: "clamp(190px, 24cqw, 300px)" }}
      data-testid={`column-${column.id}`}
    >
      <div className="shrink-0 border-b border-[var(--stroke)] px-4 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: accent, boxShadow: `0 0 0 4px ${accent}1f` }}
          />
          <input
            value={column.title}
            onChange={(event) => onRename(column.id, event.target.value)}
            onBlur={() => onRenameBlur(column.id)}
            className="min-w-0 flex-1 truncate rounded-lg bg-transparent px-1 py-0.5 font-display text-[15px] font-semibold text-[var(--navy-dark)] outline-none transition hover:bg-[var(--surface)] focus:bg-[var(--surface)]"
            aria-label="Column title"
          />
          <span className="shrink-0 rounded-full bg-[var(--surface)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--gray-text)]">
            {cards.length}
          </span>
        </div>
      </div>

      <div className="board-scroll flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 py-3">
        <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              accent={accent}
              onDelete={(cardId) => onDeleteCard(column.id, cardId)}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div
            className={clsx(
              "flex items-center justify-center rounded-2xl border border-dashed px-3 py-10 text-center text-[11px] font-semibold uppercase tracking-[0.18em] transition",
              isOver
                ? "border-[var(--accent-yellow)] text-[var(--navy-dark)]"
                : "border-[var(--stroke-strong)] text-[var(--gray-text)]"
            )}
          >
            Drop a card here
          </div>
        )}
      </div>

      <div className="shrink-0 px-3 pb-3">
        <NewCardForm
          accent={accent}
          onAdd={(title, details) => onAddCard(column.id, title, details)}
        />
      </div>
    </section>
  );
};
