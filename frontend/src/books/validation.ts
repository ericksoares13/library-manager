import type { Book, BookInput } from "../api/books";

/** Valores do formulário como digitados (tudo texto). */
export type BookForm = {
  title: string;
  author: string;
  isbn: string;
  totalCopies: string;
};

export type BookFormErrors = Partial<Record<keyof BookForm, string>>;

export const emptyBookForm: BookForm = { title: "", author: "", isbn: "", totalCopies: "1" };

export function toBookForm(book: Book): BookForm {
  return {
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    totalCopies: String(book.totalCopies),
  };
}

export function toBookInput(form: BookForm): BookInput {
  return {
    title: form.title.trim(),
    author: form.author.trim(),
    // "x" minúsculo no fim do ISBN-10 vale o mesmo que "X"
    isbn: form.isbn.trim().toUpperCase(),
    totalCopies: Number(form.totalCopies),
  };
}

/**
 * Dígito verificador do ISBN (mesma regra do `IsbnValidator` do back). ISBN-13: dígitos com pesos
 * 1 e 3 alternados, soma múltipla de 10. ISBN-10: pesos de 10 a 1 ("X" no fim vale 10), soma
 * múltipla de 11.
 */
export function hasValidCheckDigit(isbn: string) {
  const digits = [...isbn].map((char) => (char === "X" ? 10 : Number(char)));
  if (digits.length === 13) {
    return digits.reduce((sum, digit, i) => sum + digit * (i % 2 === 0 ? 1 : 3), 0) % 10 === 0;
  }
  return digits.reduce((sum, digit, i) => sum + digit * (10 - i), 0) % 11 === 0;
}

/**
 * Mesmas regras do back (`BookRequest` e `Book.updateDetails`), para avisar antes de enviar.
 * `borrowedCopies`: na edição, o total não pode ficar abaixo dos exemplares emprestados.
 */
export function validateBook(form: BookForm, borrowedCopies = 0): BookFormErrors {
  const errors: BookFormErrors = {};
  if (!form.title.trim()) {
    errors.title = "Informe o título.";
  }
  if (!form.author.trim()) {
    errors.author = "Informe o autor.";
  }
  if (!form.isbn.trim()) {
    errors.isbn = "Informe o ISBN.";
  } else if (!/^(\d{9}[\dX]|\d{13})$/.test(form.isbn.trim().toUpperCase())) {
    errors.isbn = "O ISBN deve ter 10 ou 13 dígitos.";
  } else if (!hasValidCheckDigit(form.isbn.trim().toUpperCase())) {
    errors.isbn = "ISBN inválido: confira os dígitos.";
  }
  const copies = Number(form.totalCopies);
  if (!/^\d+$/.test(form.totalCopies.trim()) || copies < 1) {
    errors.totalCopies = "Informe ao menos 1 exemplar.";
  } else if (copies < borrowedCopies) {
    errors.totalCopies = `Há ${borrowedCopies} exemplares emprestados.`;
  }
  return errors;
}
