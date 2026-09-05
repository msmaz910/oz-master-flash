import { useState, type FormEvent } from "react";
import { PlusIcon, CheckIcon, CloseIcon } from "@/components/icons";
import { PRIORITIES, PRIORITY_LABELS, type Priority } from "@/lib/kanban";

const initialFormState: { title: string; details: string; dueDate: string; priority: Priority | "" } = {
  title: "",
  details: "",
  dueDate: "",
  priority: "",
};

type NewCardFormProps = {
  accent: string;
  onAdd: (title: string, details: string, dueDate?: string, priority?: Priority) => void;
};

export const NewCardForm = ({ accent, onAdd }: NewCardFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formState, setFormState] = useState(initialFormState);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.title.trim()) {
      return;
    }
    onAdd(
      formState.title.trim(),
      formState.details.trim(),
      formState.dueDate || undefined,
      formState.priority || undefined
    );
    setFormState(initialFormState);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--stroke-strong)] px-3 py-2.5 text-xs font-semibold text-[var(--gray-text)] transition hover:border-[var(--primary-blue)] hover:bg-white hover:text-[var(--primary-blue)]"
      >
        <PlusIcon className="h-4 w-4" />
        Add a card
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 rounded-2xl border border-[var(--stroke)] bg-white p-2.5 shadow-[0_10px_24px_rgba(3,33,71,0.08)]"
    >
      <input
        value={formState.title}
        onChange={(event) =>
          setFormState((prev) => ({ ...prev, title: event.target.value }))
        }
        placeholder="Card title"
        autoFocus
        className="w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] focus:bg-white"
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
      <div className="flex items-center gap-2">
        <button
          type="submit"
          style={{ backgroundColor: accent }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110"
        >
          <CheckIcon className="h-4 w-4" />
          Add card
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setFormState(initialFormState);
          }}
          title="Cancel"
          aria-label="Cancel"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-[var(--stroke)] text-[var(--gray-text)] transition hover:bg-[var(--surface)] hover:text-[var(--navy-dark)]"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
};
