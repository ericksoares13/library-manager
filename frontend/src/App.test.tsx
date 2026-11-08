import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { Loan } from "./api/loans";
import { mockApi, page } from "./test/mockApi";

const loan: Loan = {
  id: "l1",
  bookId: "b1",
  bookTitle: "Dom Casmurro",
  memberId: "m1",
  memberName: "Ana Souza",
  loanDate: "2026-11-08",
  dueDate: "2026-11-22",
  returnDate: null,
  overdue: false,
};

describe("Navegação entre as telas", () => {
  beforeEach(() => {
    // O hash da URL sobrevive entre os testes no jsdom
    window.history.replaceState(null, "", "/");
    mockApi(
      { method: "GET", url: "/api/books", body: page([]) },
      { method: "GET", url: "/api/members", body: page([]) },
      { method: "GET", url: "/api/loans", body: page([]) },
    );
  });

  it("abre na tela de livros quando o endereço não tem uma tela conhecida", async () => {
    // Arrange
    window.history.replaceState(null, "", "/#/desconhecida");

    // Act
    render(<App />);

    // Assert
    expect(await screen.findByRole("heading", { level: 1, name: "Livros" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Livros" })).toHaveAttribute("aria-current", "page");
  });

  it("troca para a tela de membros pela aba", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<App />);

    // Act
    await user.click(screen.getByRole("link", { name: "Membros" }));

    // Assert
    expect(await screen.findByRole("heading", { level: 1, name: "Membros" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Membros" })).toHaveAttribute("aria-current", "page");
    expect(window.location.hash).toBe("#/membros");
  });

  it("troca de aba sem recarregar a lista", async () => {
    // Arrange
    const user = userEvent.setup();
    const fetchMock = mockApi(
      { method: "GET", url: "/api/books", body: page([]) },
      { method: "GET", url: "/api/members", body: page([]) },
      { method: "GET", url: "/api/loans", body: page([]) },
    );
    render(<App />);
    await user.click(screen.getByRole("link", { name: "Membros" }));

    // Act
    await user.click(screen.getByRole("link", { name: "Livros" }));

    // Assert
    expect(screen.getByRole("heading", { level: 1, name: "Livros" })).toBeVisible();
    expect(screen.queryByText("Carregando livros…")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("atualiza a lista de livros depois de um empréstimo na outra aba", async () => {
    // Arrange
    window.history.replaceState(null, "", "/#/emprestimos");
    const fetchMock = mockApi(
      { method: "GET", url: "/api/books", body: page([]) },
      { method: "GET", url: "/api/members", body: page([]) },
      { method: "GET", url: "/api/loans", body: page([loan]) },
      { method: "POST", url: "/api/loans/l1/return", body: { ...loan, returnDate: "2026-11-10" } },
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Devolver Dom Casmurro de Ana Souza" }),
    );
    const booksRequests = () =>
      fetchMock.mock.calls.filter(([input]) => String(input).startsWith("/api/books")).length;
    const before = booksRequests();

    // Act
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Devolver" }),
    );

    // Assert
    await waitFor(() => expect(booksRequests()).toBe(before + 1));
  });
  it("volta para a rolagem em que cada aba estava", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<App />);
    vi.stubGlobal("scrollY", 1200);
    await user.click(screen.getByRole("link", { name: "Membros" }));
    const scrollTo = vi.spyOn(window, "scrollTo");

    // Act
    await user.click(screen.getByRole("link", { name: "Livros" }));

    // Assert
    await waitFor(() => expect(scrollTo).toHaveBeenLastCalledWith(0, 1200));
  });

  it("abre a página do livro dentro da aba Livros", async () => {
    // Arrange
    window.history.replaceState(null, "", "/#/livros/b1");
    mockApi(
      { method: "GET", url: "/api/books", body: page([]) },
      {
        method: "GET",
        url: "/api/books/b1",
        body: {
          id: "b1",
          title: "Helena",
          author: "Machado de Assis",
          isbn: "9788575201176",
          totalCopies: 1,
          availableCopies: 1,
        },
      },
      { method: "GET", url: "/api/members", body: page([]) },
      { method: "GET", url: "/api/loans", body: page([]) },
    );

    // Act
    render(<App />);

    // Assert
    expect(await screen.findByRole("heading", { level: 1, name: "Helena" })).toBeVisible();
    const sections = screen.getByRole("navigation", { name: "Seções" });
    expect(within(sections).getByRole("link", { name: "Livros" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("abre a página do membro dentro da aba Membros", async () => {
    // Arrange
    window.history.replaceState(null, "", "/#/membros/m1");
    mockApi(
      { method: "GET", url: "/api/books", body: page([]) },
      { method: "GET", url: "/api/members", body: page([]) },
      { method: "GET", url: "/api/members/m1", body: { id: "m1", name: "Ana", email: "a@b.com" } },
      { method: "GET", url: "/api/loans", body: page([]) },
    );

    // Act
    render(<App />);

    // Assert
    expect(await screen.findByRole("heading", { level: 1, name: "Ana" })).toBeVisible();
    const sections = screen.getByRole("navigation", { name: "Seções" });
    expect(within(sections).getByRole("link", { name: "Membros" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Membros", current: false })).toHaveAttribute(
      "href",
      "#/membros",
    );
  });

  it("abre direto na tela do endereço", async () => {
    // Arrange
    window.history.replaceState(null, "", "/#/membros");

    // Act
    render(<App />);

    // Assert
    expect(await screen.findByRole("heading", { level: 1, name: "Membros" })).toBeInTheDocument();
  });
});
