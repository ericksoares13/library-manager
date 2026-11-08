import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { loansApi, type Loan, type LoanSort, type LoanStatus } from "../api/loans";
import { CollectionView } from "../components/collection/CollectionView";
import { useCollection } from "../components/collection/useCollection";
import { SwapIcon } from "../components/icons";
import { BorrowSheet } from "./BorrowSheet";
import { LoanRow } from "./LoanRow";
import { countLabel, emptyByStatus, sortOptions, statusOptions } from "./options";
import { ReturnDialog } from "./ReturnDialog";

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
        renderItem={(loan) => <LoanRow loan={loan} view="all" onReturn={setReturning} />}
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
