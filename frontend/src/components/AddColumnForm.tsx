import { useState, type FormEvent } from "react";
import { PlusIcon, CheckIcon, CloseIcon } from "@/components/icons";

type AddColumnFormProps = {
  onAdd: (title: string) => void;
};

export const AddColumnForm = ({ onAdd }: AddColumnFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setTitle("");
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-12 shrink-0 items-center justify-center gap-2 self-start rounded-2xl border border-dashed border-[var(--stroke-strong)] px-4 text-xs font-semibold text-[var(--gray-text)] transition hover:border-[var(--primary-blue)] hover:bg-white hover:text-[var(--primary-blue)]"
        style={{ minWidth: "clamp(150px, 18cqw, 220px)" }}
      >
        <PlusIcon className="h-4 w-4" />
        Add column
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-fit shrink-0 items-center gap-1.5 self-start rounded-2xl border border-[var(--stroke)] bg-white p-2 shadow-[0_10px_24px_rgba(3,33,71,0.08)]"
      style={{ minWidth: "clamp(190px, 24cqw, 300px)" }}
    >
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Column name"
        autoFocus
        className="min-w-0 flex-1 rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] focus:bg-white"
      />
      <button
        type="submit"
        title="Add column"
        aria-label="Add column"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--primary-blue)] text-white transition hover:brightness-110"
      >
        <CheckIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => {
          setIsOpen(false);
          setTitle("");
        }}
        title="Cancel"
        aria-label="Cancel"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--stroke)] text-[var(--gray-text)] transition hover:bg-[var(--surface)] hover:text-[var(--navy-dark)]"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </form>
  );
};
