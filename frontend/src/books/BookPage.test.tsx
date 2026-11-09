import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import type { Book } from "../api/books";
import type { Loan } from "../api/loans";
import type { Member } from "../api/members";
import { lastListParams, mockApi, page, sentBody, type Route } from "../test/mockApi";
import { BookPage } from "./BookPage";

// A listagem dos empréstimos (busca, situação, paginação) é a compartilhada, testada nas outras
// telas; aqui fica o que é da página do livro

function book(overrides: Partial<Book> = {}): Book {
  return {
    id: "b1",
    title: "Dom Casmurro",
    author: "Machado de Assis",
    isbn: "9788575201176",
    totalCopies: 2,
    availableCopies: 1,
    ...overrides,
  };
}

function loan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: "l1",
    bookId: "b1",
    bookTitle: "Dom Casmurro",
    memberId: "m1",
    memberName: "Ana Souza",
    loanDate: "2026-11-08",
    dueDate: "2026-11-22",
    returnDate: null,
    overdue: false,
    ...overrides,
  };
}

const ana: Member = { id: "m1", name: "Ana Souza", email: "ana@example.com", photoVersion: null };

const bookRoute = (body: Book = book()): Route => ({ method: "GET", url: "/api/books/b1", body });

const loansRoute = (items: Loan[]): Route => ({
  method: "GET",
  url: "/api/loans",
  body: page(items),
});

/** Renderiza a página e espera o título do livro aparecer. */
async function renderLoaded() {
  const user = userEvent.setup();
  render(<BookPage id="b1" />);
  await screen.findByRole("heading", { level: 1, name: "Dom Casmurro" });
  return user;
}

describe("Página do livro", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/#/livros/b1");
  });

  it("mostra o livro, os exemplares disponíveis e quem pegou emprestado", async () => {
    // Arrange
    const fetchMock = mockApi(bookRoute(), loansRoute([loan()]));

    // Act
    render(<BookPage id="b1" />);

    // Assert
    expect(
      await screen.findByText(
        "Machado de Assis · ISBN 9788575201176 · 1 de 2 exemplares disponíveis",
      ),
    ).toBeVisible();
    const list = await screen.findByRole("list", { name: "Empréstimos de Dom Casmurro" });
    expect(within(list).getByRole("link", { name: "Ana Souza" })).toHaveAttribute(
      "href",
      "#/membros/m1",
    );
    expect(lastListParams(fetchMock, "/api/loans")).toMatchObject({
      bookId: "b1",
      status: "ALL",
    });
  });

  it("avisa quando o livro não existe mais", async () => {
    // Arrange
    mockApi(
      { method: "GET", url: "/api/books/b1", status: 404, body: { message: "not found" } },
      loansRoute([]),
    );

    // Act
    render(<BookPage id="b1" />);

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent("Este livro não existe mais.");
    expect(screen.getByRole("link", { name: "Livros" })).toHaveAttribute("href", "#/livros");
  });

  it("não deixa emprestar livro sem exemplar disponível", async () => {
    // Arrange
    mockApi(bookRoute(book({ availableCopies: 0 })), loansRoute([]));

    // Act
    render(<BookPage id="b1" />);

    // Assert
    expect(await screen.findByText(/0 de 2 exemplares disponíveis/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Emprestar" })).toBeDisabled();
  });

  it("empresta o livro da página escolhendo só o membro", async () => {
    // Arrange
    mockApi(bookRoute(), loansRoute([]), {
      method: "GET",
      url: "/api/members",
      body: page([ana]),
    });
    const user = await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Emprestar" }));
    const dialog = screen.getByRole("dialog", { name: "Novo empréstimo" });
    await user.click(within(dialog).getByRole("combobox", { name: "Membro" }));
    await user.click(await screen.findByRole("option", { name: /Ana Souza/ }));
    const fetchMock = mockApi(bookRoute(), loansRoute([loan()]), {
      method: "POST",
      url: "/api/loans",
      status: 201,
      body: loan(),
    });

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Emprestar" }));

    // Assert
    expect(sentBody(fetchMock, "POST", "/api/loans")).toEqual({ bookId: "b1", memberId: "m1" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("volta para a lista de livros depois de excluir", async () => {
    // Arrange
    mockApi(bookRoute(), loansRoute([]), { method: "DELETE", url: "/api/books/b1", status: 204 });
    const user = await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Excluir Dom Casmurro" }));
    const dialog = screen.getByRole("alertdialog");

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    // Assert
    await waitFor(() => expect(window.location.hash).toBe("#/livros"));
  });

  it("abre a edição com os dados do livro", async () => {
    // Arrange
    mockApi(bookRoute(), loansRoute([]));
    const user = await renderLoaded();

    // Act
    await user.click(screen.getByRole("button", { name: "Editar Dom Casmurro" }));

    // Assert
    const dialog = screen.getByRole("dialog", { name: "Editar livro" });
    expect(within(dialog).getByLabelText("Título")).toHaveValue("Dom Casmurro");
  });
});
