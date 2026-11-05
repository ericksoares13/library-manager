import { useId, useState } from "react";
import { booksApi, type Book } from "../api/books";
import { ApiError } from "../api/client";
import { Modal } from "../components/Modal";

type Props = {
  book: Book;
  onClose: () => void;
  onDeleted: (id: string) => void;
};

/** Confirmação antes de excluir: a ação não pode ser desfeita. */
export function DeleteBookDialog({ book, onClose, onDeleted }: Props) {
  const titleId = useId();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    try {
      await booksApi.remove(book.id);
      onDeleted(book.id);
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 409
          ? "Este livro tem empréstimos ativos e não pode ser excluído."
          : "Não foi possível excluir o livro. Tente novamente.",
      );
      setDeleting(false);
    }
  }

  return (
    <Modal titleId={titleId} role="alertdialog" onClose={onClose}>
      <h2 id={titleId}>Excluir “{book.title}”?</h2>
      <p className="secondary">Esta ação não pode ser desfeita.</p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <footer className="sheet-actions">
        <button type="button" className="button" onClick={onClose} autoFocus>
          Cancelar
        </button>
        <button
          type="button"
          className="button destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          Excluir
        </button>
      </footer>
    </Modal>
  );
}
