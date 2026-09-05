import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card } from "@/lib/kanban";
import { TrashIcon } from "@/components/icons";

type KanbanCardProps = {
  card: Card;
  accent: string;
  onDelete: (cardId: string) => void;
};

export const KanbanCard = ({ card, accent, onDelete }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "group relative cursor-grab rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3.5",
        "shadow-[0_6px_16px_rgba(3,33,71,0.06)] transition-all duration-150",
        "hover:-translate-y-0.5 hover:border-[var(--stroke-strong)] hover:shadow-[0_14px_28px_rgba(3,33,71,0.12)]",
        isDragging && "cursor-grabbing opacity-50 shadow-[0_18px_32px_rgba(3,33,71,0.16)]"
      )}
      {...attributes}
      {...listeners}
      data-testid={`card-${card.id}`}
    >
      <span
        aria-hidden
        className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full opacity-70"
        style={{ backgroundColor: accent }}
      />
      <div className="flex items-start gap-2 pl-1.5">
        <div className="min-w-0 flex-1">
          <h4 className="font-display text-[15px] font-semibold leading-5 text-[var(--navy-dark)]">
            {card.title}
          </h4>
          <p className="mt-1.5 text-[13px] leading-5 text-[var(--gray-text)]">
            {card.details}
          </p>
        </div>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onDelete(card.id)}
          className={clsx(
            "-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--gray-text)]",
            "transition hover:bg-red-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200",
            "opacity-60 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          )}
          title={`Delete ${card.title}`}
          aria-label={`Delete ${card.title}`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
};
