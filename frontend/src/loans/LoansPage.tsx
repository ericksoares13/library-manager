import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { loansApi, type Loan, type LoanSort, type LoanStatus } from "../api/loans";
import { CollectionView, type SortOption } from "../components/collection/CollectionView";
import { useCollection } from "../components/collection/useCollection";
import { SwapIcon } from "../components/icons";
import { BorrowSheet } from "./BorrowSheet";
import { bookTitleOf, formatDate, loanSituation, memberNameOf } from "./format";
import { ReturnDialog } from "./ReturnDialog";

const statusOptions: SortOption<LoanStatus>[] = [
  { value: "ACTIVE", label: "Ativos" },
  { value: "OVERDUE", label: "Atrasados" },
  { value: "RETURNED", label: "Devolvidos" },
  { value: "ALL", label: "Todos" },
];

const sortOptions: SortOption<LoanSort>[] = [
  { value: "DUE_DATE", label: "Vencimento" },
  { value: "RECENT", label: "Mais recentes" },
];

const emptyByStatus: Record<LoanStatus, string> = {
  ACTIVE: "Nenhum empréstimo ativo.",
  OVERDUE: "Nenhum empréstimo atrasado.",
  RETURNED: "Nenhuma devolução registrada.",
  ALL: "Nenhum empréstimo registrado.",
};

// Singular e plural de cada situação, para a linha abaixo do título ("4 empréstimos ativos")
const countByStatus: Record<LoanStatus, [string, string]> = {
  ACTIVE: ["empréstimo ativo", "empréstimos ativos"],
  OVERDUE: ["empréstimo atrasado", "empréstimos atrasados"],
  RETURNED: ["empréstimo devolvido", "empréstimos devolvidos"],
  ALL: ["empréstimo registrado", "empréstimos registrados"],
};

function countLabel(total: number, status: LoanStatus = "ACTIVE") {
  const [singular, plural] = countByStatus[status];
  return `${total} ${total === 1 ? singular : plural}`;
}

function badgeClass(loan: Loan) {
  if (loan.returnDate) {
    return "badge";
  }
  return loan.overdue ? "badge is-late" : "badge is-out";
}

export function LoansPage() {
  const loans = useCollection<Loan, LoanSort, LoanStatus>(loansApi.list, "DUE_DATE", "ACTIVE");
  const [borrowing, setBorrowing] = useState(false);
  const [returning, setReturning] = useState<Loan | null>(null);

  return (
    <>
      <CollectionView
        collection={loans}
        title="Empréstimos"
        countLabel={countLabel}
        addLabel="Emprestar"
        sortOptions={sortOptions}
        filter={{ label: "Situação", options: statusOptions }}
        search={{ label: "Buscar empréstimos", placeholder: "Buscar por livro ou membro" }}
        messages={{
          loading: "Carregando empréstimos…",
          loadError: "Não foi possível carregar os empréstimos.",
          emptyTitle: "Nenhum empréstimo registrado",
          emptyText: "Empreste o primeiro livro.",
          notFound: (q) => `Nenhum empréstimo encontrado para “${q}”.`,
          emptyFilter: (status) => emptyByStatus[status],
        }}
        emptyIcon={SwapIcon}
        itemKey={(loan) => loan.id}
        onAdd={() => setBorrowing(true)}
        renderItem={(loan) => (
          <>
            <div className="row-main">
              <span className={loan.bookTitle ? "row-title" : "row-title is-missing"}>
                {bookTitleOf(loan)}
              </span>
              <span className="row-subtitle">
                {memberNameOf(loan)} · Emprestado em {formatDate(loan.loanDate)}
              </span>
            </div>
            <span className={badgeClass(loan)}>{loanSituation(loan)}</span>
            {!loan.returnDate && (
              <div className="row-actions">
                <button
                  type="button"
                  className="button"
                  aria-label={`Devolver ${bookTitleOf(loan)}`}
                  onClick={() => setReturning(loan)}
                >
                  Devolver
                </button>
              </div>
            )}
          </>
        )}
      />

      {/* Emprestar ou devolver avisa as listagens (api/changes), que buscam a página de novo */}
      <AnimatePresence>
        {borrowing && (
          <BorrowSheet
            key="borrow"
            onBorrowed={() => setBorrowing(false)}
            onClose={() => setBorrowing(false)}
          />
        )}
        {returning && (
          <ReturnDialog
            key="return"
            loan={returning}
            onReturned={() => setReturning(null)}
            onClose={() => setReturning(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
