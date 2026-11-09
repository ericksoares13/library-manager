import type { Loan } from "../api/loans";
import { BookCover } from "../books/BookCover";
import { MenuBookIcon } from "../components/icons";
import { MemberPhoto } from "../members/MemberPhoto";
import { bookTitleOf, formatDate, loanSituation, memberNameOf } from "./format";

type Props = {
  loan: Loan;
  /**
   * De onde a lista é vista: `all` (tela de empréstimos: livro e membro), `member` (página do
   * membro: só o livro, o membro já está no título) ou `book` (página do livro: só o membro).
   */
  view: "all" | "member" | "book";
  onReturn: (loan: Loan) => void;
};

function badgeClass(loan: Loan) {
  if (loan.returnDate) {
    return "badge";
  }
  return loan.overdue ? "badge is-late" : "badge is-out";
}

/** Livro do empréstimo, com link para a página dele (excluído depois da devolução: só o texto). */
function BookName({ loan }: { loan: Loan }) {
  return loan.bookTitle ? (
    <a className="row-link" href={`#/livros/${encodeURIComponent(loan.bookId)}`}>
      {loan.bookTitle}
    </a>
  ) : (
    bookTitleOf(loan)
  );
}

/** Membro do empréstimo, com link para a página dele (excluído depois da devolução: só o texto). */
function MemberName({ loan }: { loan: Loan }) {
  return loan.memberName ? (
    <a className="row-link" href={`#/membros/${encodeURIComponent(loan.memberId)}`}>
      {loan.memberName}
    </a>
  ) : (
    memberNameOf(loan)
  );
}

/**
 * Imagem de quem dá nome à linha: a capa do livro ou, na página do livro, a foto do membro.
 * Excluído depois da devolução: só o ícone.
 */
function Thumbnail({ loan, view }: Pick<Props, "loan" | "view">) {
  if (view === "book") {
    // Membro excluído chega sem versão de foto: fica o ícone
    const member = {
      id: loan.memberId,
      name: memberNameOf(loan),
      photoVersion: loan.memberPhotoVersion,
    };
    return <MemberPhoto member={member} size="small" />;
  }
  return loan.bookTitle && loan.bookIsbn ? (
    <BookCover isbn={loan.bookIsbn} title={loan.bookTitle} size="small" />
  ) : (
    <span className="cover cover-small cover-placeholder" aria-hidden>
      <MenuBookIcon className="cover-icon" />
    </span>
  );
}

/** Linha de um empréstimo (tela de empréstimos e páginas do membro e do livro). */
export function LoanRow({ loan, view, onReturn }: Props) {
  const loanDate = `Emprestado em ${formatDate(loan.loanDate)}`;
  const missing = view === "book" ? !loan.memberName : !loan.bookTitle;
  return (
    <>
      <Thumbnail loan={loan} view={view} />
      <div className="row-main">
        <span className={missing ? "row-title is-missing" : "row-title"}>
          {view === "book" ? <MemberName loan={loan} /> : <BookName loan={loan} />}
        </span>
        <span className="row-subtitle">
          {view === "all" && (
            <>
              <MemberName loan={loan} />
              {" · "}
            </>
          )}
          {loanDate}
        </span>
      </div>
      <span className={badgeClass(loan)}>{loanSituation(loan)}</span>
      {!loan.returnDate && (
        <div className="row-actions">
          <button
            type="button"
            className="button"
            aria-label={`Devolver ${bookTitleOf(loan)} de ${memberNameOf(loan)}`}
            onClick={() => onReturn(loan)}
          >
            Devolver
          </button>
        </div>
      )}
    </>
  );
}
