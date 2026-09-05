import { PRIORITIES, PRIORITY_LABELS, hasActiveFilters, EMPTY_FILTERS, type CardFilters, type Priority } from "@/lib/kanban";
import { CloseIcon } from "@/components/icons";

type FilterBarProps = {
  filters: CardFilters;
  onChange: (filters: CardFilters) => void;
  visibleCount: number;
  totalCount: number;
  availableLabels: string[];
};

const fieldClass =
  "rounded-xl border border-[var(--stroke)] bg-white/70 px-3 py-1.5 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] focus:bg-white";

export const FilterBar = ({
  filters,
  onChange,
  visibleCount,
  totalCount,
  availableLabels,
}: FilterBarProps) => {
  const isFiltering = hasActiveFilters(filters);

  return (
    <div className="relative z-10 flex flex-wrap items-center gap-2 border-b border-[var(--stroke)] bg-white/50 px-5 py-2.5">
      <input
        value={filters.query}
        onChange={(event) => onChange({ ...filters, query: event.target.value })}
        placeholder="Search cards..."
        aria-label="Search cards"
        className={`${fieldClass} w-48`}
      />
      <select
        value={filters.priority}
        onChange={(event) =>
          onChange({ ...filters, priority: event.target.value as Priority | "all" })
        }
        aria-label="Filter by priority"
        className={fieldClass}
      >
        <option value="all">Any priority</option>
        {PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {PRIORITY_LABELS[priority]}
          </option>
        ))}
      </select>
      {availableLabels.length > 0 && (
        <select
          value={filters.label}
          onChange={(event) => onChange({ ...filters, label: event.target.value })}
          aria-label="Filter by label"
          className={fieldClass}
        >
          <option value="all">Any label</option>
          {availableLabels.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      )}
      <label className="flex items-center gap-1.5 text-sm text-[var(--navy-dark)]">
        <input
          type="checkbox"
          checked={filters.overdueOnly}
          onChange={(event) => onChange({ ...filters, overdueOnly: event.target.checked })}
        />
        Overdue only
      </label>
      {isFiltering && (
        <>
          <span className="text-xs text-[var(--gray-text)]">
            Showing {visibleCount} of {totalCount} cards
          </span>
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[var(--secondary-purple)] transition hover:bg-[var(--surface)]"
          >
            <CloseIcon className="h-3.5 w-3.5" />
            Clear filters
          </button>
        </>
      )}
    </div>
  );
};
