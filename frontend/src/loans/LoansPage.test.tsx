import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Book } from "../api/books";
import type { Loan } from "../api/loans";
import type { Member } from "../api/members";
import { lastListParams, mockApi, page, sentBody, type Route } from "../test/mockApi";
import { LoansPage } from "./LoansPage";

// Busca, ordenação, paginação e estados de carregamento são da listagem compartilhada e estão
// testados na página de livros; aqui fica só o que é próprio dos empréstimos

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

const domCasmurro: Book = {
  id: "b1",
  title: "Dom Casmurro",
  author: "Machado de Assis",
  isbn: "9788575201176",
  totalCopies: 2,
  availableCopies: 1,
};

const helena: Book = { ...domCasmurro, id: "b2", title: "Helena", availableCopies: 0 };

const ana: Member = { id: "m1", name: "Ana Souza", email: "ana@example.com" };

const loansRoute = (items: Loan[]): Route => ({
  method: "GET",
  url: "/api/loans",
  body: page(items),
});

/** Rotas do formulário de empréstimo: a busca de livros e a de membros. */
const pickerRoutes: Route[] = [
  { method: "GET", url: "/api/books", body: page([domCasmurro, helena]) },
  { method: "GET", url: "/api/members", body: page([ana]) },
];

/** Renderiza a página e espera a lista carregar. */
async function renderLoaded() {
  const user = userEvent.setup();
  render(<LoansPage />);
  await screen.findByRole("list", { name: "Empréstimos" });
  return user;
}

async function openBorrowSheet(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Emprestar" }));
  return screen.getByRole("dialog", { name: "Novo empréstimo" });
}

/** Escolhe livro e membro clicando nas opções da busca. */
async function pickBookAndMember(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) {
  await user.type(within(dialog).getByRole("combobox", { name: "Livro" }), "dom");
  await user.click(await screen.findByRole("option", { name: /Dom Casmurro/ }));
  await user.type(within(dialog).getByRole("combobox", { name: "Membro" }), "ana");
  await user.click(await screen.findByRole("option", { name: /Ana Souza/ }));
}

describe("Página de empréstimos", () => {
  it("mostra os ativos por vencimento, com os links do livro e do membro e o prazo", async () => {
    // Arrange
    const fetchMock = mockApi(
      loansRoute([
        loan({ overdue: true, dueDate: "2026-11-01" }),
        loan({ id: "l2", bookTitle: "Helena", memberName: "Bruno Lima" }),
      ]),
    );

    // Act
    render(<LoansPage />);

    // Assert
    const rows = within(await screen.findByRole("list", { name: "Empréstimos" })).getAllByRole(
      "listitem",
    );
    expect(within(rows[0]).getByRole("link", { name: "Dom Casmurro" })).toHaveAttribute(
      "href",
      "#/livros/b1",
    );
    expect(rows[0]).toHaveTextContent("Ana Souza · Emprestado em 08/11/2026");
    expect(within(rows[0]).getByRole("link", { name: "Ana Souza" })).toHaveAttribute(
      "href",
      "#/membros/m1",
    );
    expect(within(rows[0]).getByText("Atrasado desde 01/11/2026")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Devolver até 22/11/2026")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Situação Ativos, ordenar por Vencimento" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 empréstimos ativos")).toBeInTheDocument();
    expect(lastListParams(fetchMock, "/api/loans")).toMatchObject({
      status: "ACTIVE",
      sort: "DUE_DATE",
    });
  });

  it("troca a situação pelo filtro e volta para a primeira página", async () => {
    // Arrange
    mockApi({ method: "GET", url: "/api/loans", body: page([loan()], { total: 45 }) });
    const user = await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Página 2" }));
    const fetchMock = mockApi(loansRoute([]));
    await user.click(screen.getByRole("button", { name: /^Situação Ativos/ }));

    // Act
    await user.click(screen.getByRole("option", { name: "Atrasados" }));

    // Assert
    expect(await screen.findByText("Nenhum empréstimo atrasado.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Situação Atrasados, ordenar por Vencimento" }),
    ).toBeInTheDocument();
    expect(lastListParams(fetchMock, "/api/loans")).toMatchObject({
      status: "OVERDUE",
      page: "0",
    });
  });

  it("mantém o filtro na tela quando não há empréstimos ativos", async () => {
    // Arrange
    mockApi(loansRoute([]));

    // Act
    render(<LoansPage />);

    // Assert
    expect(await screen.findByText("Nenhum empréstimo ativo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Situação Ativos/ })).toBeInTheDocument();
  });

  it("mostra os devolvidos sem o botão de devolver, e o livro excluído", async () => {
    // Arrange
    mockApi(loansRoute([loan({ bookTitle: null, returnDate: "2026-11-10" })]));

    // Act
    render(<LoansPage />);

    // Assert
    const [row] = within(await screen.findByRole("list", { name: "Empréstimos" })).getAllByRole(
      "listitem",
    );
    expect(within(row).getByText("Livro excluído")).toBeInTheDocument();
    expect(within(row).getByText("Devolvido em 10/11/2026")).toBeInTheDocument();
    expect(within(row).queryByRole("button")).not.toBeInTheDocument();
  });

  it("empresta o livro escolhido ao membro escolhido", async () => {
    // Arrange
    mockApi(loansRoute([]), ...pickerRoutes);
    const user = userEvent.setup();
    render(<LoansPage />);
    await screen.findByText("Nenhum empréstimo ativo.");
    const dialog = await openBorrowSheet(user);
    await pickBookAndMember(user, dialog);
    const fetchMock = mockApi(loansRoute([loan()]), {
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
    expect(await screen.findByText("Devolver até 22/11/2026")).toBeInTheDocument();
  });

  it("não deixa escolher livro sem exemplar disponível", async () => {
    // Arrange
    mockApi(loansRoute([]), ...pickerRoutes);
    const user = userEvent.setup();
    render(<LoansPage />);
    const dialog = await openBorrowSheet(user);
    await user.click(within(dialog).getByRole("combobox", { name: "Livro" }));
    const unavailable = await screen.findByRole("option", { name: /Helena/ });

    // Act
    await user.click(unavailable);

    // Assert
    expect(unavailable).toHaveAttribute("aria-disabled", "true");
    expect(within(dialog).getByRole("combobox", { name: "Livro" })).toHaveValue("");
  });

  it("escolhe pelo teclado", async () => {
    // Arrange
    mockApi(loansRoute([]), ...pickerRoutes);
    const user = userEvent.setup();
    render(<LoansPage />);
    const dialog = await openBorrowSheet(user);
    const field = within(dialog).getByRole("combobox", { name: "Membro" });
    await user.click(field);
    await screen.findByRole("option", { name: /Ana Souza/ });

    // Act
    await user.keyboard("{ArrowDown}{Enter}");

    // Assert
    expect(field).toHaveValue("Ana Souza");
    expect(field).toHaveAttribute("aria-expanded", "false");
  });

  it("fecha só a lista de opções com Esc, sem fechar o formulário", async () => {
    // Arrange
    mockApi(loansRoute([]), ...pickerRoutes);
    const user = userEvent.setup();
    render(<LoansPage />);
    const dialog = await openBorrowSheet(user);
    const field = within(dialog).getByRole("combobox", { name: "Membro" });
    await user.click(field);
    await screen.findByRole("option", { name: /Ana Souza/ });

    // Act
    await user.keyboard("{Escape}");

    // Assert
    expect(field).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("dialog", { name: "Novo empréstimo" })).toBeInTheDocument();
  });
  it("mantém as opções na tela enquanto a busca do texto novo carrega", async () => {
    // Arrange
    mockApi(loansRoute([]), ...pickerRoutes);
    const user = userEvent.setup();
    render(<LoansPage />);
    const dialog = await openBorrowSheet(user);
    const field = within(dialog).getByRole("combobox", { name: "Livro" });
    await user.click(field);
    await screen.findByRole("option", { name: /Dom Casmurro/ });
    // A próxima busca não responde: a tela fica no meio do carregamento
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );

    // Act
    await user.type(field, "dom");

    // Assert
    expect(screen.getByRole("option", { name: /Dom Casmurro/ })).toBeInTheDocument();
    expect(screen.queryByText("Buscando…")).not.toBeInTheDocument();
    expect(screen.getByRole("listbox", { name: "Livro" })).toHaveAttribute("aria-busy", "true");
  });

  it("avisa que a lista de opções não mostra tudo", async () => {
    // Arrange
    mockApi(loansRoute([]), {
      method: "GET",
      url: "/api/books",
      body: page([domCasmurro, helena], { total: 45 }),
    });
    const user = userEvent.setup();
    render(<LoansPage />);
    const dialog = await openBorrowSheet(user);

    // Act
    await user.click(within(dialog).getByRole("combobox", { name: "Livro" }));

    // Assert
    expect(
      await screen.findByText("Mostrando 2 de 45. Digite para encontrar os outros."),
    ).toBeInTheDocument();
  });

  it("pede o livro e o membro antes de enviar", async () => {
    // Arrange
    const fetchMock = mockApi(loansRoute([]), ...pickerRoutes);
    const user = userEvent.setup();
    render(<LoansPage />);
    const dialog = await openBorrowSheet(user);

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Emprestar" }));

    // Assert
    expect(within(dialog).getByRole("combobox", { name: "Livro" })).toHaveAccessibleDescription(
      "Escolha um livro.",
    );
    expect(within(dialog).getByRole("combobox", { name: "Membro" })).toHaveAccessibleDescription(
      "Escolha um membro.",
    );
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("explica em português quando a API recusa o empréstimo", async () => {
    // Arrange
    mockApi(loansRoute([]), ...pickerRoutes, {
      method: "POST",
      url: "/api/loans",
      status: 409,
      body: { message: "Ana Souza has reached the limit of 3 active loans" },
    });
    const user = userEvent.setup();
    render(<LoansPage />);
    const dialog = await openBorrowSheet(user);
    await pickBookAndMember(user, dialog);

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Emprestar" }));

    // Assert
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Este membro já tem 3 empréstimos ativos, o limite.",
    );
  });

  it("devolve depois de confirmar", async () => {
    // Arrange
    mockApi(loansRoute([loan()]));
    const user = await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Devolver Dom Casmurro de Ana Souza" }));
    const dialog = screen.getByRole("alertdialog", { name: "Devolver “Dom Casmurro”?" });
    const fetchMock = mockApi(loansRoute([]), {
      method: "POST",
      url: "/api/loans/l1/return",
      body: loan({ returnDate: "2026-11-10" }),
    });

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Devolver" }));

    // Assert
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Nenhum empréstimo ativo.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/loans/l1/return", expect.anything());
  });

  it("avisa quando o empréstimo já tinha sido devolvido", async () => {
    // Arrange
    mockApi(loansRoute([loan()]), {
      method: "POST",
      url: "/api/loans/l1/return",
      status: 409,
      body: { message: "Loan has already been returned" },
    });
    const user = await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Devolver Dom Casmurro de Ana Souza" }));
    const dialog = screen.getByRole("alertdialog");

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Devolver" }));

    // Assert
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Este empréstimo já foi devolvido.",
    );
  });
});
