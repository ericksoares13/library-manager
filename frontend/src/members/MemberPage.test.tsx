import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import type { Book } from "../api/books";
import type { Loan } from "../api/loans";
import type { Member } from "../api/members";
import { lastListParams, mockApi, page, sentBody, type Route } from "../test/mockApi";
import { MemberPage } from "./MemberPage";

// A listagem dos empréstimos (busca, situação, paginação) é a compartilhada, testada nas outras
// telas; aqui fica o que é da página do membro

const ana: Member = { id: "m1", name: "Ana Souza", email: "ana@example.com", photoVersion: null };

function loan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: "l1",
    bookId: "b1",
    bookTitle: "Dom Casmurro",
    bookIsbn: "9788575201176",
    memberId: "m1",
    memberName: "Ana Souza",
    memberPhotoVersion: null,
    loanDate: "2026-11-08",
    dueDate: "2026-11-22",
    returnDate: null,
    overdue: false,
    ...overrides,
  };
}

const domCasmurro: Book = {
  id: "b1",
  title: "Dom Casmurro",
  author: "Machado de Assis",
  isbn: "9788575201176",
  totalCopies: 2,
  availableCopies: 1,
};

const memberRoute: Route = { method: "GET", url: "/api/members/m1", body: ana };

/** Rota dos empréstimos do membro (a lista e a contagem dos ativos usam a mesma). */
const loansRoute = (items: Loan[]): Route => ({
  method: "GET",
  url: "/api/loans",
  body: page(items),
});

/** Renderiza a página e espera o nome do membro aparecer. */
async function renderLoaded() {
  const user = userEvent.setup();
  render(<MemberPage id="m1" />);
  await screen.findByRole("heading", { level: 1, name: "Ana Souza" });
  return user;
}

describe("Página do membro", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/#/membros/m1");
  });

  it("mostra o membro, quantos livros está com e todos os empréstimos dele", async () => {
    // Arrange
    const fetchMock = mockApi(
      memberRoute,
      loansRoute([loan(), loan({ id: "l2", bookTitle: "Helena" })]),
    );

    // Act
    render(<MemberPage id="m1" />);

    // Assert
    expect(await screen.findByText("ana@example.com · 2 de 3 livros emprestados")).toBeVisible();
    const list = await screen.findByRole("list", { name: "Empréstimos de Ana Souza" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).queryByRole("link", { name: "Ana Souza" })).not.toBeInTheDocument();
    expect(lastListParams(fetchMock, "/api/loans")).toMatchObject({
      memberId: "m1",
      status: "ALL",
    });
  });

  it("avisa quando o membro não existe mais", async () => {
    // Arrange
    mockApi(
      { method: "GET", url: "/api/members/m1", status: 404, body: { message: "not found" } },
      loansRoute([]),
    );

    // Act
    render(<MemberPage id="m1" />);

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent("Este membro não existe mais.");
    expect(screen.getByRole("link", { name: "Membros" })).toHaveAttribute("href", "#/membros");
  });

  it("não deixa emprestar a quem está no limite de empréstimos", async () => {
    // Arrange
    mockApi(memberRoute, loansRoute([loan(), loan({ id: "l2" }), loan({ id: "l3" })]));

    // Act
    render(<MemberPage id="m1" />);

    // Assert
    expect(await screen.findByText(/3 de 3 livros emprestados/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Emprestar" })).toBeDisabled();
  });

  it("empresta ao membro da página escolhendo só o livro", async () => {
    // Arrange
    mockApi(memberRoute, loansRoute([]), {
      method: "GET",
      url: "/api/books",
      body: page([domCasmurro]),
    });
    const user = await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Emprestar" }));
    const dialog = screen.getByRole("dialog", { name: "Novo empréstimo" });
    await user.click(within(dialog).getByRole("combobox", { name: "Livro" }));
    await user.click(await screen.findByRole("option", { name: /Dom Casmurro/ }));
    const fetchMock = mockApi(memberRoute, loansRoute([loan()]), {
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

  it("mostra o membro já escolhido no formulário de empréstimo", async () => {
    // Arrange
    mockApi(memberRoute, loansRoute([]));
    const user = await renderLoaded();

    // Act
    await user.click(screen.getByRole("button", { name: "Emprestar" }));

    // Assert
    const dialog = screen.getByRole("dialog", { name: "Novo empréstimo" });
    expect(within(dialog).getByLabelText("Membro")).toHaveValue("Ana Souza");
    expect(within(dialog).getByLabelText("Membro")).toBeDisabled();
  });

  it("volta para a lista de membros depois de excluir", async () => {
    // Arrange
    mockApi(memberRoute, loansRoute([]), { method: "DELETE", url: "/api/members/m1", status: 204 });
    const user = await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Excluir Ana Souza" }));
    const dialog = screen.getByRole("alertdialog");

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    // Assert
    await waitFor(() => expect(window.location.hash).toBe("#/membros"));
  });

  it("abre a edição com os dados do membro", async () => {
    // Arrange
    mockApi(memberRoute, loansRoute([]));
    const user = await renderLoaded();

    // Act
    await user.click(screen.getByRole("button", { name: "Editar Ana Souza" }));

    // Assert
    const dialog = screen.getByRole("dialog", { name: "Editar membro" });
    expect(within(dialog).getByLabelText("E-mail")).toHaveValue("ana@example.com");
  });
});
