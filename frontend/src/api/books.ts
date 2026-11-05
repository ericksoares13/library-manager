import { request } from "./client";

export type Book = {
  id: string;
  title: string;
  author: string;
  isbn: string;
  totalCopies: number;
  availableCopies: number;
};

export type BookInput = Pick<Book, "title" | "author" | "isbn" | "totalCopies">;

const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const booksApi = {
  list: () => request<Book[]>("/api/books"),
  create: (book: BookInput) => request<Book>("/api/books", json("POST", book)),
  update: (id: string, book: BookInput) => request<Book>(`/api/books/${id}`, json("PUT", book)),
  remove: (id: string) => request<void>(`/api/books/${id}`, { method: "DELETE" }),
};
