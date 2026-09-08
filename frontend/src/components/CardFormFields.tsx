import {
  normalizeLabels,
  PRIORITIES,
  PRIORITY_LABELS,
  type Card,
  type Priority,
} from "@/lib/kanban";

/** Raw form state: `priority` and `labels` are still in their input-field shapes. */
export type CardFormState = {
  title: string;
  details: string;
  dueDate: string;
  priority: Priority | "";
  labels: string;
};

export const EMPTY_CARD_FORM: CardFormState = {
  title: "",
  details: "",
  dueDate: "",
  priority: "",
  labels: "",
};

export const cardFormStateFrom = (card: Card): CardFormState => ({
  title: card.title,
  details: card.details,
  dueDate: card.dueDate ?? "",
  priority: card.priority ?? "",
  labels: (card.labels ?? []).join(", "),
});

export type CardFormValues = {
  title: string;
  details: string;
  dueDate?: string;
  priority?: Priority;
  labels?: string[];
};

/** Normalizes form state into card values, or null when the title is blank. */
export const toCardValues = (state: CardFormState): CardFormValues | null => {
  const title = state.title.trim();
  if (!title) {
    return null;
  }
  const labels = normalizeLabels(state.labels);
  return {
    title,
    details: state.details.trim(),
    dueDate: state.dueDate || undefined,
    priority: state.priority || undefined,
    labels: labels.length > 0 ? labels : undefined,
  };
};

const inputClass =
  "rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] focus:bg-white";

type CardFormFieldsProps = {
  state: CardFormState;
  onChange: (state: CardFormState) => void;
  // The edit form names its title/details fields for assistive tech; the
  // new-card form is identified by its placeholders instead.
  titleLabel?: string;
  detailsLabel?: string;
};

export const CardFormFields = ({
  state,
  onChange,
  titleLabel,
  detailsLabel,
}: CardFormFieldsProps) => {
  const update = (patch: Partial<CardFormState>) => onChange({ ...state, ...patch });

  return (
    <>
      <input
        value={state.title}
        onChange={(event) => update({ title: event.target.value })}
        placeholder="Card title"
        autoFocus
        className={`w-full text-sm font-medium ${inputClass}`}
        aria-label={titleLabel}
        required
      />
      <textarea
        value={state.details}
        onChange={(event) => update({ details: event.target.value })}
        placeholder="Details"
        rows={2}
        className={`w-full resize-none text-[13px] ${inputClass}`}
        aria-label={detailsLabel}
      />
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={state.dueDate}
          onChange={(event) => update({ dueDate: event.target.value })}
          aria-label="Due date"
          className={`flex-1 text-[13px] ${inputClass}`}
        />
        <select
          value={state.priority}
          onChange={(event) => update({ priority: event.target.value as Priority | "" })}
          aria-label="Priority"
          className={`flex-1 text-[13px] ${inputClass}`}
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
        value={state.labels}
        onChange={(event) => update({ labels: event.target.value })}
        placeholder="Labels (comma-separated)"
        aria-label="Labels"
        className={`w-full text-[13px] ${inputClass}`}
      />
    </>
  );
};
