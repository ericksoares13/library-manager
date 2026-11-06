import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { booksApi, type Book, type BookSort } from "../api/books";
import { CollectionView, type SortOption } from "../components/collection/CollectionView";
import { useCollection } from "../components/collection/useCollection";
import { ConfirmDeleteDialog } from "../components/ConfirmDeleteDialog";
import { DeleteIcon, EditIcon, MenuBookIcon } from "../components/icons";
import { BookFormSheet } from "./BookFormSheet";

type Editing = { book?: Book } | null;

const sortOptions: SortOption<BookSort>[] = [
  { value: "TITLE", label: "Título" },
  { value: "AUTHOR", label: "Autor" },
  { value: "RECENT", label: "Mais recentes" },
  { value: "AVAILABILITY", label: "Disponibilidade" },
];

function availabilityLabel(book: Book) {
  return book.availableCopies === 0
    ? "Indisponível"
    : `${book.availableCopies} de ${book.totalCopies} disponíveis`;
}

export function BooksPage() {
  const books = useCollection<Book, BookSort>(booksApi.list, "TITLE");
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Book | null>(null);

  // A ordem e o total vêm do back: depois de salvar ou excluir, a página é buscada de novo
  function handleSaved() {
    setEditing(null);
    books.reload();
  }

  return (
    <>
      <CollectionView
        collection={books}
        title="Livros"
        countLabel={(total) => `${total} ${total === 1 ? "livro" : "livros"} no acervo`}
        sortOptions={sortOptions}
        search={{ label: "Buscar livros", placeholder: "Buscar por título, autor ou ISBN" }}
        messages={{
          loading: "Carregando livros…",
          loadError: "Não foi possível carregar os livros.",
          emptyTitle: "Nenhum livro cadastrado",
          emptyText: "Adicione o primeiro livro do acervo.",
          notFound: (q) => `Nenhum livro encontrado para “${q}”.`,
        }}
        emptyIcon={MenuBookIcon}
        itemKey={(book) => book.id}
        onAdd={() => setEditing({})}
        renderItem={(book) => (
          <>
            <div className="row-main">
              <span className="row-title">{book.title}</span>
              <span className="row-subtitle">
                {book.author} · ISBN {book.isbn}
              </span>
            </div>
            <span className={book.availableCopies === 0 ? "badge is-out" : "badge"}>
              {availabilityLabel(book)}
            </span>
            <div className="row-actions">
              <button
                type="button"
                className="icon-button"
                aria-label={`Editar ${book.title}`}
                onClick={() => setEditing({ book })}
              >
                <EditIcon className="icon" aria-hidden />
              </button>
              <button
                type="button"
                className="icon-button destructive"
                aria-label={`Excluir ${book.title}`}
                onClick={() => setDeleting(book)}
              >
                <DeleteIcon className="icon" aria-hidden />
              </button>
            </div>
          </>
        )}
      />

      <AnimatePresence>
        {editing && (
          <BookFormSheet
            key="form"
            book={editing.book}
            onClose={() => setEditing(null)}
            onSaved={handleSaved}
          />
        )}
        {deleting && (
          <ConfirmDeleteDialog
            key="delete"
            name={deleting.title}
            conflictMessage="Este livro tem empréstimos ativos e não pode ser excluído."
            errorMessage="Não foi possível excluir o livro. Tente novamente."
            onConfirm={async () => {
              await booksApi.remove(deleting.id);
              setDeleting(null);
              books.reload();
            }}
            onClose={() => setDeleting(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
