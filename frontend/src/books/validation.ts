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
    isbn: form.isbn.trim(),
    totalCopies: Number(form.totalCopies),
  };
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
  } else if (!/^(\d{10}|\d{13})$/.test(form.isbn.trim())) {
    errors.isbn = "O ISBN deve ter 10 ou 13 dígitos.";
  }
  const copies = Number(form.totalCopies);
  if (!/^\d+$/.test(form.totalCopies.trim()) || copies < 1) {
    errors.totalCopies = "Informe ao menos 1 exemplar.";
  } else if (copies < borrowedCopies) {
    errors.totalCopies = `Há ${borrowedCopies} exemplares emprestados.`;
  }
  return errors;
}
