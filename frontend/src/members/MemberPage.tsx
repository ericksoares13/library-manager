import { AnimatePresence } from "motion/react";
import { useCallback, useState } from "react";
import { ApiError } from "../api/client";
import { loansApi, type Loan, type LoanSort, type LoanStatus } from "../api/loans";
import { membersApi } from "../api/members";
import type { PageQuery } from "../api/page";
import { useResource } from "../api/useResource";
import { CollectionView } from "../components/collection/CollectionView";
import { useCollection } from "../components/collection/useCollection";
import { ConfirmDeleteDialog } from "../components/ConfirmDeleteDialog";
import { AddIcon, ChevronLeftIcon, DeleteIcon, EditIcon, SwapIcon } from "../components/icons";
import { BorrowSheet } from "../loans/BorrowSheet";
import { LoanRow } from "../loans/LoanRow";
import { emptyByStatus, sortOptions, statusOptions } from "../loans/options";
import { ReturnDialog } from "../loans/ReturnDialog";
import { MemberFormSheet } from "./MemberFormSheet";

/** Limite de empréstimos ativos por membro (`Member.MAX_ACTIVE_LOANS` no back). */
const MAX_ACTIVE_LOANS = 3;

type Dialog = "edit" | "delete" | "borrow" | { returning: Loan } | null;

const backLink = (
  <a className="back-link" href="#/membros">
    <ChevronLeftIcon className="icon" aria-hidden />
    Membros
  </a>
);

/** Página de um membro: dados, empréstimos dele e as ações (emprestar, editar, excluir). */
export function MemberPage({ id }: { id: string }) {
  const member = useResource(useCallback((signal) => membersApi.get(id, signal), [id]));
  // Quantos ativos ele tem (o limite vale para emprestar), independente do filtro da lista
  const activeLoans = useResource(
    useCallback(
      (signal) =>
        loansApi
          .list({ page: 0, sort: "DUE_DATE", q: "", filter: "ACTIVE" }, signal, { memberId: id })
          .then((page) => page.totalItems),
      [id],
    ),
  );
  const loans = useCollection<Loan, LoanSort, LoanStatus>(
    useCallback(
      (query: PageQuery<LoanSort, LoanStatus>, signal: AbortSignal) =>
        loansApi.list(query, signal, { memberId: id }),
      [id],
    ),
    "DUE_DATE",
    "ALL",
  );
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);

  if (member.error) {
    const gone = member.error instanceof ApiError && member.error.status === 404;
    return (
      <>
        {backLink}
        <div role="alert" className="notice">
          <p>{gone ? "Este membro não existe mais." : "Não foi possível carregar o membro."}</p>
        </div>
      </>
    );
  }
  if (!member.data) {
    return (
      <>
        {backLink}
        <p role="status" className="secondary">
          Carregando membro…
        </p>
      </>
    );
  }

  const { name, email } = member.data;
  const atLimit = activeLoans.data !== null && activeLoans.data >= MAX_ACTIVE_LOANS;

  return (
    <>
      {backLink}
      <CollectionView
        collection={loans}
        title={`Empréstimos de ${name}`}
        header={
          <header className="page-header">
            <div>
              <h1 className="display">{name}</h1>
              <p className="secondary page-count">
                {email}
                {activeLoans.data !== null &&
                  ` · ${activeLoans.data} de ${MAX_ACTIVE_LOANS} livros emprestados`}
              </p>
            </div>
            <div className="page-actions">
              <button
                type="button"
                className="icon-button"
                aria-label={`Editar ${name}`}
                onClick={() => setDialog("edit")}
              >
                <EditIcon className="icon" aria-hidden />
              </button>
              <button
                type="button"
                className="icon-button destructive"
                aria-label={`Excluir ${name}`}
                onClick={() => setDialog("delete")}
              >
                <DeleteIcon className="icon" aria-hidden />
              </button>
              {/* No limite fica no lugar, apagado: a linha ao lado diz por quê */}
              <button
                type="button"
                className="button primary"
                disabled={atLimit}
                onClick={() => setDialog("borrow")}
              >
                <AddIcon className="icon" aria-hidden />
                Emprestar
              </button>
            </div>
          </header>
        }
        sortOptions={sortOptions}
        filter={{ label: "Situação", options: statusOptions }}
        search={{ label: "Buscar empréstimos", placeholder: "Buscar por livro" }}
        messages={{
          loading: "Carregando empréstimos…",
          loadError: "Não foi possível carregar os empréstimos.",
          emptyTitle: "Nenhum empréstimo registrado",
          emptyText: "",
          notFound: (q) => `Nenhum empréstimo encontrado para “${q}”.`,
          emptyFilter: (status) => emptyByStatus[status],
        }}
        emptyIcon={SwapIcon}
        itemKey={(loan) => loan.id}
        renderItem={(loan) => (
          <LoanRow loan={loan} view="member" onReturn={(returning) => setDialog({ returning })} />
        )}
      />

      {/* Salvar, excluir, emprestar ou devolver avisa as listagens (api/changes) */}
      <AnimatePresence>
        {dialog === "edit" && (
          <MemberFormSheet key="edit" member={member.data} onClose={close} onSaved={close} />
        )}
        {dialog === "delete" && (
          <ConfirmDeleteDialog
            key="delete"
            name={name}
            conflictMessage="Este membro tem empréstimos ativos e não pode ser excluído."
            errorMessage="Não foi possível excluir o membro. Tente novamente."
            onConfirm={async () => {
              await membersApi.remove(id);
              window.location.hash = "#/membros";
            }}
            onClose={close}
          />
        )}
        {dialog === "borrow" && (
          <BorrowSheet key="borrow" member={member.data} onBorrowed={close} onClose={close} />
        )}
        {dialog !== null && typeof dialog === "object" && (
          <ReturnDialog key="return" loan={dialog.returning} onReturned={close} onClose={close} />
        )}
      </AnimatePresence>
    </>
  );
}
