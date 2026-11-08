import { useId, useState, type FormEvent } from "react";
import { booksApi, type Book } from "../api/books";
import { loansApi } from "../api/loans";
import { membersApi, type Member } from "../api/members";
import { Field } from "../components/Field";
import { CloseIcon } from "../components/icons";
import { Modal } from "../components/Modal";
import { SearchPicker } from "../components/SearchPicker";
import { borrowErrorMessage } from "./format";

type Props = {
  /** Membro já escolhido (página do membro): o formulário só pede o livro. */
  member?: Member;
  /** Livro já escolhido (página do livro): o formulário só pede o membro. */
  book?: Book;
  onClose: () => void;
  onBorrowed: () => void;
};

// Fora do componente: a mesma função a cada render, para o campo não buscar de novo à toa
const searchBooks = (q: string, signal: AbortSignal) =>
  booksApi.list({ page: 0, sort: "TITLE", q }, signal);

const searchMembers = (q: string, signal: AbortSignal) =>
  membersApi.list({ page: 0, sort: "NAME", q }, signal);

const LOAN_PERIOD_DAYS = 14;

export function BorrowSheet({
  member: presetMember,
  book: presetBook,
  onClose,
  onBorrowed,
}: Props) {
  const titleId = useId();
  const [book, setBook] = useState<Book | null>(presetBook ?? null);
  const [member, setMember] = useState<Member | null>(presetMember ?? null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!book || !member) {
      return;
    }
    setSaving(true);
    setServerError(null);
    try {
      await loansApi.borrow(book.id, member.id);
      onBorrowed();
    } catch (error) {
      setServerError(borrowErrorMessage(error));
      setSaving(false);
    }
  }

  return (
    <Modal titleId={titleId} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <header className="sheet-header">
          <h2 id={titleId}>Novo empréstimo</h2>
          <button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}>
            <CloseIcon className="icon" aria-hidden />
          </button>
        </header>

        {presetBook ? (
          <Field label="Livro" value={presetBook.title} disabled readOnly />
        ) : (
          <SearchPicker
            label="Livro"
            placeholder="Buscar por título, autor ou ISBN"
            autoFocus
            search={searchBooks}
            itemKey={(item) => item.id}
            itemLabel={(item) => item.title}
            isDisabled={(item) => item.availableCopies === 0}
            renderOption={(item) => (
              <>
                <span className="picker-option-title">{item.title}</span>
                <span className="picker-option-detail">
                  {item.author} ·{" "}
                  {item.availableCopies === 0
                    ? "Indisponível"
                    : `${item.availableCopies} de ${item.totalCopies} disponíveis`}
                </span>
              </>
            )}
            value={book}
            onChange={(item) => {
              setBook(item);
              setServerError(null);
            }}
            error={submitted && !book ? "Escolha um livro." : undefined}
          />
        )}
        {presetMember ? (
          <Field label="Membro" value={presetMember.name} disabled readOnly />
        ) : (
          <SearchPicker
            label="Membro"
            placeholder="Buscar por nome ou e-mail"
            autoFocus={Boolean(presetBook)}
            search={searchMembers}
            itemKey={(item) => item.id}
            itemLabel={(item) => item.name}
            renderOption={(item) => (
              <>
                <span className="picker-option-title">{item.name}</span>
                <span className="picker-option-detail">{item.email}</span>
              </>
            )}
            value={member}
            onChange={(item) => {
              setMember(item);
              setServerError(null);
            }}
            error={submitted && !member ? "Escolha um membro." : undefined}
          />
        )}
        <p className="secondary">O prazo de devolução é de {LOAN_PERIOD_DAYS} dias.</p>

        {serverError && (
          <p role="alert" className="form-error">
            {serverError}
          </p>
        )}

        <footer className="sheet-actions">
          <button type="button" className="button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="button primary" disabled={saving}>
            {saving ? "Emprestando…" : "Emprestar"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
