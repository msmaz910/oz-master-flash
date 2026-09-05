import { useState, type FormEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card } from "@/lib/kanban";
import { CheckIcon, CloseIcon, EditIcon, TrashIcon } from "@/components/icons";

type KanbanCardProps = {
  card: Card;
  accent: string;
  onDelete: (cardId: string) => void;
  onEdit: (cardId: string, title: string, details: string) => void;
};

export const KanbanCard = ({ card, accent, onDelete, onEdit }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, disabled: false });

  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState({ title: card.title, details: card.details });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const startEditing = () => {
    setFormState({ title: card.title, details: card.details });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setFormState({ title: card.title, details: card.details });
    setIsEditing(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = formState.title.trim();
    if (!title) {
      return;
    }
    onEdit(card.id, title, formState.details.trim());
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <form
        ref={setNodeRef}
        style={style}
        onSubmit={handleSubmit}
        onPointerDown={(event) => event.stopPropagation()}
        className="space-y-2 rounded-2xl border border-[var(--stroke)] bg-white p-2.5 shadow-[0_10px_24px_rgba(3,33,71,0.08)]"
        data-testid={`card-${card.id}`}
      >
        <input
          value={formState.title}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, title: event.target.value }))
          }
          placeholder="Card title"
          autoFocus
          className="w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] focus:bg-white"
          aria-label="Card title"
          required
        />
        <textarea
          value={formState.details}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, details: event.target.value }))
          }
          placeholder="Details"
          rows={2}
          className="w-full resize-none rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] focus:bg-white"
          aria-label="Card details"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            style={{ backgroundColor: accent }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110"
          >
            <CheckIcon className="h-4 w-4" />
            Save
          </button>
          <button
            type="button"
            onClick={cancelEditing}
            title="Cancel"
            aria-label="Cancel"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-[var(--stroke)] text-[var(--gray-text)] transition hover:bg-[var(--surface)] hover:text-[var(--navy-dark)]"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      </form>
    );
  }

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
        <div
          className={clsx(
            "-mr-1 -mt-1 flex shrink-0 items-center gap-0.5",
            "opacity-60 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          )}
        >
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={startEditing}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--gray-text)] transition hover:bg-[var(--surface)] hover:text-[var(--navy-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)]/40"
            title={`Edit ${card.title}`}
            aria-label={`Edit ${card.title}`}
          >
            <EditIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onDelete(card.id)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--gray-text)] transition hover:bg-red-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
            title={`Delete ${card.title}`}
            aria-label={`Delete ${card.title}`}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
};
