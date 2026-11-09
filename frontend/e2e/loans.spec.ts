import { expect, test } from "@playwright/test";
import {
  borrow,
  displayDate,
  newBook,
  newMember,
  registerBook,
  registerMember,
  search,
} from "./flows";

/** Prazo do empréstimo (`Loan.LOAN_PERIOD_DAYS` no back). */
const LOAN_PERIOD_DAYS = 14;

test.describe("Empréstimos", () => {
  test("empresta o último exemplar e o livro fica indisponível", async ({ page }) => {
    // Arrange
    const book = newBook(1);
    const member = newMember();
    await registerBook(page, book);
    await registerMember(page, member);

    // Act
    await borrow(page, book, member);

    // Assert
    await search(page, "Buscar empréstimos", member.name);
    const row = page.getByRole("list", { name: "Empréstimos" }).getByRole("listitem");
    await expect(row).toHaveCount(1);
    await expect(row.getByRole("link", { name: book.title })).toBeVisible();
    await expect(row.getByText(`Devolver até ${displayDate(LOAN_PERIOD_DAYS)}`)).toBeVisible();

    await row.getByRole("link", { name: book.title }).click();
    await expect(page.getByText(/0 de 1 exemplar disponível/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Emprestar" })).toBeDisabled();
  });

  test("devolve o livro e o empréstimo passa para os devolvidos", async ({ page }) => {
    // Arrange
    const book = newBook(1);
    const member = newMember();
    await registerBook(page, book);
    await registerMember(page, member);
    await borrow(page, book, member);

    // Act
    await search(page, "Buscar empréstimos", member.name);
    await page.getByRole("button", { name: `Devolver ${book.title} de ${member.name}` }).click();
    const dialog = page.getByRole("alertdialog", { name: `Devolver “${book.title}”?` });
    await dialog.getByRole("button", { name: "Devolver" }).click();

    // Assert
    await expect(dialog).toBeHidden();
    // Sai dos ativos: a busca pelo membro não acha mais nenhum
    await expect(
      page.getByText(`Nenhum empréstimo encontrado para “${member.name}”.`),
    ).toBeVisible();

    // A página do livro lista todos os empréstimos dele, devolvidos inclusive
    await page.goto("/#/livros");
    await search(page, "Buscar livros", book.title);
    await page.getByRole("link", { name: book.title }).click();
    await expect(page.getByText(/1 de 1 exemplar disponível/)).toBeVisible();
    const row = page
      .getByRole("list", { name: `Empréstimos de ${book.title}` })
      .getByRole("listitem");
    await expect(row.getByRole("link", { name: member.name })).toBeVisible();
    await expect(row.getByText(`Devolvido em ${displayDate()}`)).toBeVisible();
    await expect(row.getByRole("button", { name: /Devolver/ })).toHaveCount(0);
  });
});
