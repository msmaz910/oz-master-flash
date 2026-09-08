import { useState, type FormEvent } from "react";
import { PlusIcon, CheckIcon, CloseIcon } from "@/components/icons";
import type { Priority } from "@/lib/kanban";
import {
  CardFormFields,
  EMPTY_CARD_FORM,
  toCardValues,
} from "@/components/CardFormFields";

type NewCardFormProps = {
  accent: string;
  onAdd: (
    title: string,
    details: string,
    dueDate?: string,
    priority?: Priority,
    labels?: string[]
  ) => void;
};

export const NewCardForm = ({ accent, onAdd }: NewCardFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formState, setFormState] = useState(EMPTY_CARD_FORM);

  const close = () => {
    setIsOpen(false);
    setFormState(EMPTY_CARD_FORM);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = toCardValues(formState);
    if (!values) {
      return;
    }
    onAdd(values.title, values.details, values.dueDate, values.priority, values.labels);
    close();
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
      className="space-y-2 rounded-2xl border border-[var(--stroke)] bg-white p-2.5 shadow-[0_10px_24px_rgba(36,31,24,0.08)]"
    >
      <CardFormFields state={formState} onChange={setFormState} />
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
          onClick={close}
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
