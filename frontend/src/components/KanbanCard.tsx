import { useState, type FormEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import {
  isOverdue,
  labelColorFor,
  normalizeLabels,
  PRIORITIES,
  PRIORITY_LABELS,
  type Card,
  type Priority,
} from "@/lib/kanban";
import {
  CalendarIcon,
  CheckIcon,
  CloseIcon,
  EditIcon,
  FlagIcon,
  MessageIcon,
  TrashIcon,
} from "@/components/icons";
import { CardComments } from "@/components/CardComments";

const PRIORITY_STYLES: Record<Priority, string> = {
  low: "bg-stone-100 text-stone-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-600",
};

export const CardMeta = ({ card }: { card: Card }) => {
  if (!card.dueDate && !card.priority && !card.comments?.length && !card.labels?.length) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {card.labels?.map((label) => {
        const color = labelColorFor(label);
        return (
          <span
            key={label}
            className={clsx(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
              color.bg,
              color.text
            )}
          >
            {label}
          </span>
        );
      })}
      {card.priority && (
        <span
          className={clsx(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            PRIORITY_STYLES[card.priority]
          )}
        >
          <FlagIcon className="h-3 w-3" />
          {PRIORITY_LABELS[card.priority]}
        </span>
      )}
      {card.dueDate && (
        <span
          className={clsx(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            isOverdue(card.dueDate)
              ? "bg-red-100 text-red-600"
              : "bg-[var(--surface)] text-[var(--gray-text)]"
          )}
        >
          <CalendarIcon className="h-3 w-3" />
          {card.dueDate}
        </span>
      )}
      {card.comments && card.comments.length > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--gray-text)]">
          <MessageIcon className="h-3 w-3" />
          {card.comments.length}
        </span>
      )}
    </div>
  );
};

type KanbanCardProps = {
  card: Card;
  accent: string;
  onDelete: (cardId: string) => void;
  onEdit: (cardId: string, title: string, details: string, dueDate?: string, priority?: Priority, labels?: string[]) => void;
  onAddComment: (cardId: string, text: string) => void;
};

export const KanbanCard = ({ card, accent, onDelete, onEdit, onAddComment }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, disabled: false });

  const [isEditing, setIsEditing] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [formState, setFormState] = useState({
    title: card.title,
    details: card.details,
    dueDate: card.dueDate ?? "",
    priority: card.priority ?? ("" as Priority | ""),
    labels: (card.labels ?? []).join(", "),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const startEditing = () => {
    setFormState({
      title: card.title,
      details: card.details,
      dueDate: card.dueDate ?? "",
      priority: card.priority ?? "",
      labels: (card.labels ?? []).join(", "),
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = formState.title.trim();
    if (!title) {
      return;
    }
    const labels = normalizeLabels(formState.labels);
    onEdit(
      card.id,
      title,
      formState.details.trim(),
      formState.dueDate || undefined,
      formState.priority || undefined,
      labels.length > 0 ? labels : undefined
    );
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <form
        ref={setNodeRef}
        style={style}
        onSubmit={handleSubmit}
        onPointerDown={(event) => event.stopPropagation()}
        className="space-y-2 rounded-2xl border border-[var(--stroke)] bg-white p-2.5 shadow-[0_10px_24px_rgba(36,31,24,0.08)]"
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
          <input
            type="date"
            value={formState.dueDate}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, dueDate: event.target.value }))
            }
            aria-label="Due date"
            className="flex-1 rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] focus:bg-white"
          />
          <select
            value={formState.priority}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                priority: event.target.value as Priority | "",
              }))
            }
            aria-label="Priority"
            className="flex-1 rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] focus:bg-white"
          >
            <option value="">No priority</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </div>
        <input
          value={formState.labels}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, labels: event.target.value }))
          }
          placeholder="Labels (comma-separated)"
          aria-label="Labels"
          className="w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] focus:bg-white"
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
        "shadow-[0_6px_16px_rgba(36,31,24,0.06)] transition-all duration-150",
        "hover:-translate-y-0.5 hover:border-[var(--stroke-strong)] hover:shadow-[0_14px_28px_rgba(36,31,24,0.12)]",
        isDragging && "cursor-grabbing opacity-50 shadow-[0_18px_32px_rgba(36,31,24,0.16)]"
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
          <CardMeta card={card} />
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
            onClick={() => setIsCommentsOpen((prev) => !prev)}
            className={clsx(
              "grid h-7 w-7 shrink-0 place-items-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)]/40",
              isCommentsOpen
                ? "bg-[var(--surface)] text-[var(--navy-dark)]"
                : "text-[var(--gray-text)] hover:bg-[var(--surface)] hover:text-[var(--navy-dark)]"
            )}
            title={`Comments on ${card.title}`}
            aria-label={`Toggle comments on ${card.title}`}
          >
            <MessageIcon className="h-4 w-4" />
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
      {isCommentsOpen && (
        <CardComments
          comments={card.comments ?? []}
          onAdd={(text) => onAddComment(card.id, text)}
        />
      )}
    </article>
  );
};
