import { AnimatePresence } from "motion/react";
import { useCallback, useState } from "react";
import { booksApi } from "../api/books";
import { ApiError } from "../api/client";
import { loansApi, type Loan, type LoanSort, type LoanStatus } from "../api/loans";
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
import { BookCover } from "./BookCover";
import { BookFormSheet } from "./BookFormSheet";

type Dialog = "edit" | "delete" | "borrow" | { returning: Loan } | null;

const backLink = (
  <a className="back-link" href="#/livros">
    <ChevronLeftIcon className="icon" aria-hidden />
    Livros
  </a>
);

/** Página de um livro: capa, dados, quem pegou emprestado e as ações (emprestar, editar, excluir). */
export function BookPage({ id }: { id: string }) {
  const book = useResource(useCallback((signal) => booksApi.get(id, signal), [id]));
  const loans = useCollection<Loan, LoanSort, LoanStatus>(
    useCallback(
      (query: PageQuery<LoanSort, LoanStatus>, signal: AbortSignal) =>
        loansApi.list(query, signal, { bookId: id }),
      [id],
    ),
    "DUE_DATE",
    "ALL",
  );
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);

  if (book.error) {
    const gone = book.error instanceof ApiError && book.error.status === 404;
    return (
      <>
        {backLink}
        <div role="alert" className="notice">
          <p>{gone ? "Este livro não existe mais." : "Não foi possível carregar o livro."}</p>
        </div>
      </>
    );
  }
  if (!book.data) {
    return (
      <>
        {backLink}
        <p role="status" className="secondary">
          Carregando livro…
        </p>
      </>
    );
  }

  const { title, author, isbn, totalCopies, availableCopies } = book.data;

  return (
    <>
      {backLink}
      <CollectionView
        collection={loans}
        title={`Empréstimos de ${title}`}
        header={
          <header className="page-header">
            <div className="detail-title">
              <BookCover isbn={isbn} title={title} size="large" />
              <div>
                <h1 className="display">{title}</h1>
                <p className="secondary page-count">
                  {author} · ISBN {isbn} · {availableCopies} de {totalCopies}{" "}
                  {totalCopies === 1 ? "exemplar disponível" : "exemplares disponíveis"}
                </p>
              </div>
            </div>
            <div className="page-actions">
              <button
                type="button"
                className="icon-button"
                aria-label={`Editar ${title}`}
                onClick={() => setDialog("edit")}
              >
                <EditIcon className="icon" aria-hidden />
              </button>
              <button
                type="button"
                className="icon-button destructive"
                aria-label={`Excluir ${title}`}
                onClick={() => setDialog("delete")}
              >
                <DeleteIcon className="icon" aria-hidden />
              </button>
              {/* Sem exemplar fica no lugar, apagado: a linha ao lado diz por quê */}
              <button
                type="button"
                className="button primary"
                disabled={availableCopies === 0}
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
        search={{ label: "Buscar empréstimos", placeholder: "Buscar por membro" }}
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
          <LoanRow loan={loan} view="book" onReturn={(returning) => setDialog({ returning })} />
        )}
      />

      {/* Salvar, excluir, emprestar ou devolver avisa as listagens (api/changes) */}
      <AnimatePresence>
        {dialog === "edit" && (
          <BookFormSheet key="edit" book={book.data} onClose={close} onSaved={close} />
        )}
        {dialog === "delete" && (
          <ConfirmDeleteDialog
            key="delete"
            name={title}
            conflictMessage="Este livro tem empréstimos ativos e não pode ser excluído."
            errorMessage="Não foi possível excluir o livro. Tente novamente."
            onConfirm={async () => {
              await booksApi.remove(id);
              window.location.hash = "#/livros";
            }}
            onClose={close}
          />
        )}
        {dialog === "borrow" && (
          <BorrowSheet key="borrow" book={book.data} onBorrowed={close} onClose={close} />
        )}
        {dialog !== null && typeof dialog === "object" && (
          <ReturnDialog key="return" loan={dialog.returning} onReturned={close} onClose={close} />
        )}
      </AnimatePresence>
    </>
  );
}
