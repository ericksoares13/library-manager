import { useId, useState, type FormEvent } from "react";
import { booksApi, type Book } from "../api/books";
import { ApiError } from "../api/client";
import { Field } from "../components/Field";
import { CloseIcon } from "../components/icons";
import { Modal } from "../components/Modal";
import {
  emptyBookForm,
  toBookForm,
  toBookInput,
  validateBook,
  type BookForm,
  type BookFormErrors,
} from "./validation";

type Props = {
  /** Livro em edição; sem ele, o formulário cadastra um novo. */
  book?: Book;
  onClose: () => void;
  onSaved: (book: Book) => void;
};

type ServerError = { field?: keyof BookForm; message: string };

function toServerError(error: unknown, creating: boolean): ServerError {
  // No cadastro, o único 409 possível é o ISBN repetido (os demais casos o formulário já evita)
  if (error instanceof ApiError && error.status === 409 && creating) {
    return { field: "isbn", message: "Já existe um livro com este ISBN." };
  }
  if (error instanceof ApiError && error.status === 404) {
    return { message: "Este livro não existe mais." };
  }
  return { message: "Não foi possível salvar o livro. Tente novamente." };
}

export function BookFormSheet({ book, onClose, onSaved }: Props) {
  const titleId = useId();
  const [form, setForm] = useState<BookForm>(book ? toBookForm(book) : emptyBookForm);
  // Campos que a pessoa editou e campos que ela editou e já deixou (esses mostram o erro)
  const [edited, setEdited] = useState<Partial<Record<keyof BookForm, boolean>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof BookForm, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<ServerError | null>(null);

  const borrowedCopies = book ? book.totalCopies - book.availableCopies : 0;
  const errors: BookFormErrors = validateBook(form, borrowedCopies);

  // Valida campo a campo depois que a pessoa edita e sai dele (não a cada tecla do primeiro
  // preenchimento, nem no campo que ela só atravessou ou deixou ao clicar fora dele)
  const errorOf = (field: keyof BookForm) =>
    (touched[field] || submitted ? errors[field] : undefined) ??
    (serverError?.field === field ? serverError.message : undefined);

  const bind = (field: keyof BookForm) => ({
    value: form[field],
    error: errorOf(field),
    onChange: (event: { target: { value: string } }) => {
      setForm({ ...form, [field]: event.target.value });
      setEdited({ ...edited, [field]: true });
      if (serverError?.field === field) {
        setServerError(null);
      }
    },
    onBlur: () => {
      if (edited[field]) {
        setTouched({ ...touched, [field]: true });
      }
    },
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      return;
    }
    setSaving(true);
    setServerError(null);
    const input = toBookInput(form);
    try {
      onSaved(book ? await booksApi.update(book.id, input) : await booksApi.create(input));
    } catch (error) {
      setServerError(toServerError(error, !book));
      setSaving(false);
    }
  }

  return (
    <Modal titleId={titleId} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <header className="sheet-header">
          <h2 id={titleId}>{book ? "Editar livro" : "Novo livro"}</h2>
          <button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}>
            <CloseIcon className="icon" aria-hidden />
          </button>
        </header>

        <Field label="Título" autoFocus {...bind("title")} />
        <Field label="Autor" {...bind("author")} />
        <Field
          label="ISBN"
          inputMode="numeric"
          disabled={Boolean(book)}
          hint={book ? "O ISBN não pode ser alterado." : "10 ou 13 dígitos, sem traços."}
          {...bind("isbn")}
        />
        <Field
          label="Exemplares"
          type="number"
          min={1}
          inputMode="numeric"
          {...bind("totalCopies")}
        />

        {serverError && !serverError.field && (
          <p role="alert" className="form-error">
            {serverError.message}
          </p>
        )}

        <footer className="sheet-actions">
          <button type="button" className="button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="button primary" disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
