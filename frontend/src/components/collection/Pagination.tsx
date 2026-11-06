import { ChevronLeftIcon, ChevronRightIcon } from "../icons";
import { pageSlots } from "./pageSlots";

type Props = {
  /** Página atual, a partir de 0. */
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
};

/** Navegação entre páginas: anterior, números e próxima. Some quando há uma página só. */
export function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) {
    return null;
  }
  return (
    <nav aria-label="Paginação" className="pagination">
      <button
        type="button"
        className="icon-button"
        aria-label="Página anterior"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeftIcon className="icon" aria-hidden />
      </button>
      {pageSlots(page, totalPages).map((slot, index) =>
        slot === "gap" ? (
          <span key={`gap-${index}`} className="pagination-gap" aria-hidden>
            …
          </span>
        ) : (
          <button
            key={slot}
            type="button"
            className="pagination-page"
            aria-label={`Página ${slot + 1}`}
            aria-current={slot === page ? "page" : undefined}
            onClick={() => onChange(slot)}
          >
            {slot + 1}
          </button>
        ),
      )}
      <button
        type="button"
        className="icon-button"
        aria-label="Próxima página"
        disabled={page === totalPages - 1}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRightIcon className="icon" aria-hidden />
      </button>
    </nav>
  );
}
