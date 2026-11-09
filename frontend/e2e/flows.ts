import { expect, type Page } from "@playwright/test";

// Passos que mais de um teste faz pela tela, como um usuário faria. Cada teste cria os próprios
// livros e membros com nomes únicos: o banco de teste guarda as execuções anteriores

/** Sufixo único da execução, para os nomes e e-mails não se repetirem entre testes e execuções. */
export const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** ISBN-13 aleatório com o dígito verificador certo (a aplicação recusa os inválidos). */
export function randomIsbn() {
  const digits = `978${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
  const sum = [...digits].reduce((total, digit, i) => total + Number(digit) * (i % 2 ? 3 : 1), 0);
  return `${digits}${(10 - (sum % 10)) % 10}`;
}

/** Data de hoje (ou daqui a `days` dias) como a aplicação mostra: dd/mm/aaaa, no fuso dela. */
export function displayDate(days = 0) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export type NewBook = { title: string; author: string; isbn: string; copies: number };

export function newBook(copies = 1): NewBook {
  const id = unique();
  return { title: `Livro ${id}`, author: `Autora ${id}`, isbn: randomIsbn(), copies };
}

export type NewMember = { name: string; email: string };

export function newMember(): NewMember {
  const id = unique();
  return { name: `Membro ${id}`, email: `membro.${id}@exemplo.com` };
}

/** Cadastra o livro pela aba Livros. */
export async function registerBook(page: Page, book: NewBook) {
  await page.goto("/#/livros");
  await page.getByRole("button", { name: "Adicionar" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo livro" });
  await dialog.getByLabel("Título").fill(book.title);
  await dialog.getByLabel("Autor").fill(book.author);
  await dialog.getByLabel("ISBN").fill(book.isbn);
  await dialog.getByLabel("Exemplares").fill(String(book.copies));
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(dialog).toBeHidden();
}

/** Cadastra o membro pela aba Membros (sem foto). */
export async function registerMember(page: Page, member: NewMember) {
  await page.goto("/#/membros");
  await page.getByRole("button", { name: "Adicionar" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo membro" });
  await dialog.getByLabel("Nome").fill(member.name);
  await dialog.getByLabel("E-mail").fill(member.email);
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(dialog).toBeHidden();
}

/** Empresta o livro ao membro pela aba Empréstimos, escolhendo os dois na busca. */
export async function borrow(page: Page, book: NewBook, member: NewMember) {
  await page.goto("/#/emprestimos");
  await page.getByRole("button", { name: "Emprestar" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo empréstimo" });
  await dialog.getByRole("combobox", { name: "Livro" }).fill(book.title);
  await page.getByRole("option", { name: new RegExp(book.title) }).click();
  await dialog.getByRole("combobox", { name: "Membro" }).fill(member.name);
  await page.getByRole("option", { name: new RegExp(member.name) }).click();
  await dialog.getByRole("button", { name: "Emprestar" }).click();
  await expect(dialog).toBeHidden();
}

/** Busca na listagem da aba atual (livros, membros ou empréstimos). */
export async function search(page: Page, label: string, text: string) {
  await page.getByRole("searchbox", { name: label }).fill(text);
}
