import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { booksApi, type Book } from "../api/books";
import { AddIcon, DeleteIcon, EditIcon, MenuBookIcon, SearchIcon } from "../components/icons";
import { settle } from "../components/motion";
import { BookFormSheet } from "./BookFormSheet";
import { DeleteBookDialog } from "./DeleteBookDialog";

type Editing = { book?: Book } | null;

// Busca sem diferenciar maiúsculas nem acentos ("memorias" encontra "Memórias")
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

function availabilityLabel(book: Book) {
  return book.availableCopies === 0
    ? "Indisponível"
    : `${book.availableCopies} de ${book.totalCopies} disponíveis`;
}

export function BooksPage() {
  const reduceMotion = useReducedMotion();
  const [books, setBooks] = useState<Book[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Book | null>(null);

  useEffect(() => {
    let active = true;
    booksApi.list().then(
      (result) => active && setBooks(result),
      () => active && setLoadFailed(true),
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  function retry() {
    setLoadFailed(false);
    setAttempt(attempt + 1);
  }

  function handleSaved(saved: Book) {
    setBooks((current) => {
      const list = current ?? [];
      return list.some((book) => book.id === saved.id)
        ? list.map((book) => (book.id === saved.id ? saved : book))
        : [...list, saved];
    });
    setEditing(null);
  }

  function handleDeleted(id: string) {
    setBooks((current) => (current ?? []).filter((book) => book.id !== id));
    setDeleting(null);
  }

  const visibleBooks = (books ?? []).filter((book) =>
    [book.title, book.author, book.isbn].some((text) => normalize(text).includes(normalize(query))),
  );

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="display">Livros</h1>
          {books && books.length > 0 && (
            <p className="secondary">
              {books.length} {books.length === 1 ? "livro" : "livros"} no acervo
            </p>
          )}
        </div>
        <button type="button" className="button primary" onClick={() => setEditing({})}>
          <AddIcon className="icon" aria-hidden />
          Adicionar
        </button>
      </header>

      {loadFailed ? (
        <div role="alert" className="notice">
          <p>Não foi possível carregar os livros.</p>
          <button type="button" className="button" onClick={retry}>
            Tentar novamente
          </button>
        </div>
      ) : books === null ? (
        <p role="status" className="secondary">
          Carregando livros…
        </p>
      ) : books.length === 0 ? (
        <div className="empty">
          <MenuBookIcon className="empty-icon" aria-hidden />
          <h2>Nenhum livro cadastrado</h2>
          <p className="secondary">Adicione o primeiro livro do acervo.</p>
        </div>
      ) : (
        <>
          <label className="search">
            <SearchIcon className="icon" aria-hidden />
            <input
              type="search"
              placeholder="Buscar por título, autor ou ISBN"
              aria-label="Buscar livros"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          {visibleBooks.length === 0 ? (
            <p className="secondary">Nenhum livro encontrado para “{query}”.</p>
          ) : (
            <ul className="list" aria-label="Livros">
              <AnimatePresence initial={false}>
                {visibleBooks.map((book) => (
                  <motion.li
                    key={book.id}
                    layout={!reduceMotion}
                    className="row"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={settle}
                  >
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
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </>
      )}

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
          <DeleteBookDialog
            key="delete"
            book={deleting}
            onClose={() => setDeleting(null)}
            onDeleted={handleDeleted}
          />
        )}
      </AnimatePresence>
    </>
  );
}
