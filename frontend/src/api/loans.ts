import { json, request } from "./client";
import { pageUrl, type Page, type PageQuery } from "./page";

/** Datas no formato da API (`2026-11-08`). */
export type Loan = {
  id: string;
  bookId: string;
  /** `null` se o livro foi excluído depois da devolução. */
  bookTitle: string | null;
  /** `null` se o livro foi excluído depois da devolução. */
  bookIsbn: string | null;
  memberId: string;
  /** `null` se o membro foi excluído depois da devolução. */
  memberName: string | null;
  /** `null` sem foto ou se o membro foi excluído depois da devolução. */
  memberPhotoVersion: number | null;
  loanDate: string;
  dueDate: string;
  returnDate: string | null;
  overdue: boolean;
};

/** Situações aceitas pela API (`LoanStatus` do back). */
export type LoanStatus = "ACTIVE" | "OVERDUE" | "RETURNED" | "ALL";

/** De quem são os empréstimos listados: um membro ou um livro (sem nada, de todos). */
export type LoansOf = { memberId?: string } | { bookId?: string };

/** Ordenações aceitas pela API (`LoanSort` do back). */
export type LoanSort = "DUE_DATE" | "RECENT";

export const loansApi = {
  /** Com `of`, só os empréstimos daquele membro ou livro (páginas de detalhe). */
  list: (query: PageQuery<LoanSort, LoanStatus>, signal?: AbortSignal, of: LoansOf = {}) =>
    request<Page<Loan>>(pageUrl("/api/loans", query, { status: query.filter ?? "ACTIVE", ...of }), {
      signal,
    }),
  borrow: (bookId: string, memberId: string) =>
    request<Loan>("/api/loans", json("POST", { bookId, memberId })),
  returnLoan: (id: string) => request<Loan>(`/api/loans/${id}/return`, { method: "POST" }),
};
