import { ApiError } from "../api/client";
import type { Loan } from "../api/loans";

/** Data da API (`2026-11-08`) no formato brasileiro (`08/11/2026`), sem passar por fuso. */
export function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/** Situação mostrada na linha: atrasado, prazo ou devolução. */
export function loanSituation(loan: Loan) {
  if (loan.returnDate) {
    return `Devolvido em ${formatDate(loan.returnDate)}`;
  }
  return loan.overdue
    ? `Atrasado desde ${formatDate(loan.dueDate)}`
    : `Devolver até ${formatDate(loan.dueDate)}`;
}

/**
 * Mensagem em português para a recusa do empréstimo. O 409 tem três causas (regras do back), que
 * só a mensagem da API distingue.
 */
export function borrowErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    if (error.message.includes("limit")) {
      return "Este membro já tem 3 empréstimos ativos, o limite.";
    }
    if (error.message.includes("already has an active loan")) {
      return "Este membro já está com um exemplar deste livro.";
    }
    if (error.message.includes("No copies")) {
      return "Não há exemplar disponível deste livro.";
    }
  }
  if (error instanceof ApiError && error.status === 404) {
    return "O livro ou o membro não existe mais.";
  }
  return "Não foi possível registrar o empréstimo. Tente novamente.";
}

/** Título do livro do empréstimo (o livro pode ter sido excluído depois da devolução). */
export const bookTitleOf = (loan: Loan) => loan.bookTitle ?? "Livro excluído";

/** Nome do membro do empréstimo (o membro pode ter sido excluído depois da devolução). */
export const memberNameOf = (loan: Loan) => loan.memberName ?? "Membro excluído";
