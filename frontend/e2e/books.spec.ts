import { expect, test } from "@playwright/test";
import { borrow, newBook, newMember, registerBook, registerMember, search } from "./flows";

test.describe("Livros", () => {
  test("cadastra um livro e o encontra pela busca", async ({ page }) => {
    // Arrange
    const book = newBook(2);

    // Act
    await registerBook(page, book);
    await search(page, "Buscar livros", book.author);

    // Assert
    const list = page.getByRole("list", { name: "Livros" });
    await expect(list.getByRole("listitem")).toHaveCount(1);
    await expect(list.getByRole("link", { name: book.title })).toBeVisible();
    await expect(list.getByText(`${book.author} · ISBN ${book.isbn}`)).toBeVisible();
    await expect(list.getByText("2 de 2 disponíveis")).toBeVisible();
  });

  test("não exclui livro com empréstimo ativo", async ({ page }) => {
    // Arrange
    const book = newBook();
    const member = newMember();
    await registerBook(page, book);
    await registerMember(page, member);
    await borrow(page, book, member);

    // Act
    await page.goto("/#/livros");
    await search(page, "Buscar livros", book.title);
    await page.getByRole("button", { name: `Excluir ${book.title}` }).click();
    const dialog = page.getByRole("alertdialog", { name: `Excluir “${book.title}”?` });
    await dialog.getByRole("button", { name: "Excluir" }).click();

    // Assert
    await expect(dialog.getByRole("alert")).toHaveText(
      "Este livro tem empréstimos ativos e não pode ser excluído.",
    );
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await page.reload();
    await search(page, "Buscar livros", book.title);
    await expect(page.getByRole("link", { name: book.title })).toBeVisible();
  });
});
