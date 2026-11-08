import { json, request } from "./client";
import { pageUrl, type Page, type PageQuery } from "./page";

export type Book = {
  id: string;
  title: string;
  author: string;
  isbn: string;
  totalCopies: number;
  availableCopies: number;
};

export type BookInput = Pick<Book, "title" | "author" | "isbn" | "totalCopies">;

/** Ordenações aceitas pela API (`BookSort` do back). */
export type BookSort = "TITLE" | "AUTHOR" | "RECENT" | "AVAILABILITY";

export const booksApi = {
  list: (query: PageQuery<BookSort>, signal?: AbortSignal) =>
    request<Page<Book>>(pageUrl("/api/books", query), { signal }),
  get: (id: string, signal?: AbortSignal) => request<Book>(`/api/books/${id}`, { signal }),
  create: (book: BookInput) => request<Book>("/api/books", json("POST", book)),
  update: (id: string, book: BookInput) => request<Book>(`/api/books/${id}`, json("PUT", book)),
  remove: (id: string) => request<void>(`/api/books/${id}`, { method: "DELETE" }),
};
