import type { Card } from "@/lib/kanban";

type KanbanCardPreviewProps = {
  card: Card;
  accent?: string;
};

export const KanbanCardPreview = ({ card, accent }: KanbanCardPreviewProps) => (
  <article className="relative rotate-1 rounded-2xl border border-[var(--stroke-strong)] bg-white px-4 py-3.5 shadow-[0_24px_44px_rgba(3,33,71,0.22)]">
    <span
      aria-hidden
      className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full opacity-70"
      style={{ backgroundColor: accent ?? "#209dd7" }}
    />
    <div className="pl-1.5">
      <h4 className="font-display text-[15px] font-semibold leading-5 text-[var(--navy-dark)]">
        {card.title}
      </h4>
      <p className="mt-1.5 text-[13px] leading-5 text-[var(--gray-text)]">
        {card.details}
      </p>
    </div>
  </article>
);
