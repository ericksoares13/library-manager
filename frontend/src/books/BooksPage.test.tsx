import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Book } from "../api/books";
import { lastListParams, mockApi, page, sentBody } from "../test/mockApi";
import { BooksPage } from "./BooksPage";

function book(overrides: Partial<Book> = {}): Book {
  return {
    id: "b1",
    title: "Dom Casmurro",
    author: "Machado de Assis",
    isbn: "9788575201176",
    totalCopies: 2,
    availableCopies: 2,
    ...overrides,
  };
}

const memorias = book({
  id: "b2",
  title: "Memórias Póstumas de Brás Cubas",
  isbn: "9788535911664",
});

/** Renderiza a página e espera a lista carregar. */
async function renderLoaded() {
  const user = userEvent.setup();
  render(<BooksPage />);
  await screen.findByRole("list", { name: "Livros" });
  return user;
}

async function fillNewBookForm(user: ReturnType<typeof userEvent.setup>, isbn: string) {
  await user.click(screen.getByRole("button", { name: "Adicionar" }));
  const dialog = screen.getByRole("dialog", { name: "Novo livro" });
  await user.type(within(dialog).getByLabelText("Título"), "Quincas Borba");
  await user.type(within(dialog).getByLabelText("Autor"), "Machado de Assis");
  await user.type(within(dialog).getByLabelText("ISBN"), isbn);
  return dialog;
}

describe("Página de livros", () => {
  it("leva à página do livro pelo título", async () => {
    // Arrange
    mockApi({ method: "GET", url: "/api/books", body: page([book()]) });

    // Act
    render(<BooksPage />);

    // Assert
    expect(await screen.findByRole("link", { name: "Dom Casmurro" })).toHaveAttribute(
      "href",
      "#/livros/b1",
    );
  });

  it("mostra a primeira página por título, com a disponibilidade e o total", async () => {
    // Arrange
    const fetchMock = mockApi({
      method: "GET",
      url: "/api/books",
      body: page([
        book({ availableCopies: 1 }),
        book({ id: "b2", title: "Helena", availableCopies: 0 }),
      ]),
    });

    // Act
    render(<BooksPage />);

    // Assert
    const rows = await screen.findAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Dom Casmurro")).toBeInTheDocument();
    expect(within(rows[0]).getByText("1 de 2 disponíveis")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Indisponível")).toBeInTheDocument();
    expect(screen.getByText("2 livros no acervo")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 1–2 de 2")).toBeInTheDocument();
    expect(lastListParams(fetchMock, "/api/books")).toEqual({
      page: "0",
      size: "20",
      sort: "TITLE",
    });
  });

  it("mostra o estado vazio quando não há livros", async () => {
    // Arrange
    mockApi({ method: "GET", url: "/api/books", body: page([]) });

    // Act
    render(<BooksPage />);

    // Assert
    expect(await screen.findByText("Nenhum livro cadastrado")).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("avisa quando não consegue carregar os livros", async () => {
    // Arrange
    mockApi({ method: "GET", url: "/api/books", status: 500 });

    // Act
    render(<BooksPage />);

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os livros.",
    );
  });

  it("carrega de novo ao tentar novamente", async () => {
    // Arrange
    const user = userEvent.setup();
    mockApi({ method: "GET", url: "/api/books", status: 500 });
    render(<BooksPage />);
    const retry = await screen.findByRole("button", { name: "Tentar novamente" });
    mockApi({ method: "GET", url: "/api/books", body: page([book()]) });

    // Act
    await user.click(retry);

    // Assert
    expect(await screen.findByText("Dom Casmurro")).toBeInTheDocument();
  });

  it("busca na API pelo texto digitado, a partir da primeira página", async () => {
    // Arrange
    const fetchMock = mockApi({ method: "GET", url: "/api/books", body: page([book()]) });
    const user = await renderLoaded();

    // Act
    await user.type(screen.getByRole("searchbox", { name: "Buscar livros" }), "memorias");

    // Assert
    await waitFor(() =>
      expect(lastListParams(fetchMock, "/api/books")).toMatchObject({ q: "memorias", page: "0" }),
    );
  });

  it("avisa quando a busca não encontra nada, mantendo o total do acervo", async () => {
    // Arrange
    mockApi({ method: "GET", url: "/api/books", body: page([book()]) });
    const user = await renderLoaded();
    mockApi({ method: "GET", url: "/api/books", body: page([]) });

    // Act
    await user.type(screen.getByRole("searchbox", { name: "Buscar livros" }), "xyz");

    // Assert
    expect(await screen.findByText("Nenhum livro encontrado para “xyz”.")).toBeInTheDocument();
    expect(screen.getByText("1 livro no acervo")).toBeInTheDocument();
  });

  it("pede a ordem escolhida a partir da primeira página", async () => {
    // Arrange
    const fetchMock = mockApi({
      method: "GET",
      url: "/api/books",
      body: page([book()], { total: 45 }),
    });
    const user = await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Página 2" }));
    await user.click(screen.getByRole("button", { name: /Ordenar por/ }));

    // Act
    await user.click(screen.getByRole("option", { name: "Autor" }));

    // Assert
    await waitFor(() =>
      expect(lastListParams(fetchMock, "/api/books")).toMatchObject({ sort: "AUTHOR", page: "0" }),
    );
  });

  it("vai para a página escolhida", async () => {
    // Arrange
    const fetchMock = mockApi({
      method: "GET",
      url: "/api/books",
      body: page([book()], { total: 45 }),
    });
    const user = await renderLoaded();

    // Act
    await user.click(screen.getByRole("button", { name: "Página 3" }));

    // Assert
    await waitFor(() =>
      expect(lastListParams(fetchMock, "/api/books")).toMatchObject({ page: "2" }),
    );
  });

  it("volta para a última página que existe quando a atual fica vazia", async () => {
    // Arrange
    const lastPage = "/api/books?page=2&size=20&sort=TITLE";
    mockApi({ method: "GET", url: "/api/books", body: page([book()], { total: 41 }) });
    const user = await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Página 3" }));
    const fetchMock = mockApi(
      { method: "GET", url: lastPage, body: page([], { page: 2, total: 40 }) },
      { method: "GET", url: "/api/books", body: page([memorias], { page: 1, total: 40 }) },
    );

    // Act
    await user.click(screen.getByRole("button", { name: "Página 3" }));

    // Assert
    expect(await screen.findByText(memorias.title)).toBeInTheDocument();
    expect(lastListParams(fetchMock, "/api/books")).toMatchObject({ page: "1" });
  });

  it("cadastra um livro e busca a lista de novo", async () => {
    // Arrange
    const created = book({ id: "b3", title: "Quincas Borba", isbn: "9788535911251" });
    mockApi({ method: "GET", url: "/api/books", body: page([book()]) });
    const user = await renderLoaded();
    const dialog = await fillNewBookForm(user, created.isbn);
    const fetchMock = mockApi(
      { method: "GET", url: "/api/books", body: page([book(), created]) },
      { method: "POST", url: "/api/books", status: 201, body: created },
    );

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Salvar" }));

    // Assert
    expect(await screen.findByText("Quincas Borba")).toBeInTheDocument();
    expect(sentBody(fetchMock, "POST", "/api/books")).toEqual({
      title: "Quincas Borba",
      author: "Machado de Assis",
      isbn: created.isbn,
      totalCopies: 1,
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("não envia o formulário com dados inválidos", async () => {
    // Arrange
    const fetchMock = mockApi({ method: "GET", url: "/api/books", body: page([book()]) });
    const user = await renderLoaded();
    const dialog = await fillNewBookForm(user, "123");

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Salvar" }));

    // Assert
    expect(within(dialog).getByLabelText("ISBN")).toHaveAccessibleDescription(
      "O ISBN deve ter 10 ou 13 dígitos.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("não acusa erro no campo vazio ao clicar fora dele sem editar", async () => {
    // Arrange
    mockApi({ method: "GET", url: "/api/books", body: page([book()]) });
    const user = await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    const dialog = screen.getByRole("dialog", { name: "Novo livro" });

    // Act
    await user.click(within(dialog).getByRole("heading", { name: "Novo livro" }));

    // Assert
    expect(within(dialog).getByLabelText("Título")).not.toHaveAttribute("aria-invalid");
  });

  it("acusa o erro ao sair do campo depois de editar", async () => {
    // Arrange
    mockApi({ method: "GET", url: "/api/books", body: page([book()]) });
    const user = await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    const dialog = screen.getByRole("dialog", { name: "Novo livro" });
    await user.type(within(dialog).getByLabelText("ISBN"), "123");

    // Act
    await user.click(within(dialog).getByRole("heading", { name: "Novo livro" }));

    // Assert
    expect(within(dialog).getByLabelText("ISBN")).toHaveAccessibleDescription(
      "O ISBN deve ter 10 ou 13 dígitos.",
    );
  });

  it("mostra no campo ISBN quando ele já está cadastrado", async () => {
    // Arrange
    mockApi(
      { method: "GET", url: "/api/books", body: page([book()]) },
      {
        method: "POST",
        url: "/api/books",
        status: 409,
        body: { message: "A book with ISBN 9788575201176 already exists" },
      },
    );
    const user = await renderLoaded();
    const dialog = await fillNewBookForm(user, "9788575201176");

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Salvar" }));

    // Assert
    await waitFor(() =>
      expect(within(dialog).getByLabelText("ISBN")).toHaveAccessibleDescription(
        "Já existe um livro com este ISBN.",
      ),
    );
  });

  it("abre a edição com os dados do livro e o ISBN bloqueado", async () => {
    // Arrange
    mockApi({ method: "GET", url: "/api/books", body: page([book()]) });
    const user = await renderLoaded();

    // Act
    await user.click(screen.getByRole("button", { name: "Editar Dom Casmurro" }));

    // Assert
    const dialog = screen.getByRole("dialog", { name: "Editar livro" });
    expect(within(dialog).getByLabelText("Título")).toHaveValue("Dom Casmurro");
    expect(within(dialog).getByLabelText("ISBN")).toBeDisabled();
  });

  it("salva a edição e atualiza a lista", async () => {
    // Arrange
    const updated = book({ title: "Dom Casmurro (edição comentada)" });
    mockApi({ method: "GET", url: "/api/books", body: page([book()]) });
    const user = await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Editar Dom Casmurro" }));
    const dialog = screen.getByRole("dialog", { name: "Editar livro" });
    const title = within(dialog).getByLabelText("Título");
    await user.clear(title);
    await user.type(title, updated.title);
    const fetchMock = mockApi(
      { method: "GET", url: "/api/books", body: page([updated]) },
      { method: "PUT", url: "/api/books/b1", body: updated },
    );

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Salvar" }));

    // Assert
    expect(await screen.findByText(updated.title)).toBeInTheDocument();
    expect(sentBody(fetchMock, "PUT", "/api/books/b1")).toMatchObject({ title: updated.title });
  });

  it("exclui um livro depois da confirmação", async () => {
    // Arrange
    mockApi({ method: "GET", url: "/api/books", body: page([book(), memorias]) });
    const user = await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Excluir Dom Casmurro" }));
    const dialog = screen.getByRole("alertdialog", { name: "Excluir “Dom Casmurro”?" });
    mockApi(
      { method: "GET", url: "/api/books", body: page([memorias]) },
      { method: "DELETE", url: "/api/books/b1", status: 204 },
    );

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    // Assert
    await waitFor(() => expect(screen.queryByText("Dom Casmurro")).not.toBeInTheDocument());
    expect(screen.getByText(memorias.title)).toBeInTheDocument();
  });

  it("não exclui ao cancelar a confirmação", async () => {
    // Arrange
    const fetchMock = mockApi({ method: "GET", url: "/api/books", body: page([book()]) });
    const user = await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Excluir Dom Casmurro" }));

    // Act
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    // Assert
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByText("Dom Casmurro")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("explica por que não exclui livro com empréstimos ativos", async () => {
    // Arrange
    mockApi(
      { method: "GET", url: "/api/books", body: page([book()]) },
      {
        method: "DELETE",
        url: "/api/books/b1",
        status: 409,
        body: { message: "A book with active loans cannot be deleted" },
      },
    );
    const user = await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Excluir Dom Casmurro" }));
    const dialog = screen.getByRole("alertdialog");

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    // Assert
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Este livro tem empréstimos ativos e não pode ser excluído.",
    );
  });
});
