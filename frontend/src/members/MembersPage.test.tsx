import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Member } from "../api/members";
import { mockApi, sentBody } from "../test/mockApi";
import { MembersPage } from "./MembersPage";

function member(overrides: Partial<Member> = {}): Member {
  return { id: "m1", name: "Ana Souza", email: "ana@example.com", ...overrides };
}

const bruno = member({ id: "m2", name: "Bruno Lima", email: "bruno@example.com" });

const duplicatedEmail = {
  status: 409,
  body: { message: "A member with email bruno@example.com already exists" },
};

/** Renderiza a página e espera a lista carregar. */
async function renderLoaded() {
  const user = userEvent.setup();
  render(<MembersPage />);
  await screen.findByRole("list", { name: "Membros" });
  return user;
}

async function fillNewMemberForm(user: ReturnType<typeof userEvent.setup>, email: string) {
  await user.click(screen.getByRole("button", { name: "Adicionar" }));
  const dialog = screen.getByRole("dialog", { name: "Novo membro" });
  await user.type(within(dialog).getByLabelText("Nome"), "Carla Dias");
  await user.type(within(dialog).getByLabelText("E-mail"), email);
  return dialog;
}

async function openEditForm(user: ReturnType<typeof userEvent.setup>, email: string) {
  await user.click(screen.getByRole("button", { name: "Editar Ana Souza" }));
  const dialog = screen.getByRole("dialog", { name: "Editar membro" });
  const field = within(dialog).getByLabelText("E-mail");
  await user.clear(field);
  await user.type(field, email);
  return dialog;
}

describe("Página de membros", () => {
  it("mostra os membros com o e-mail de cada um", async () => {
    // Arrange
    mockApi({ method: "GET", url: "/api/members", body: [member(), bruno] });

    // Act
    render(<MembersPage />);

    // Assert
    const rows = await screen.findAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Ana Souza")).toBeInTheDocument();
    expect(within(rows[0]).getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText("2 membros cadastrados")).toBeInTheDocument();
  });

  it("mostra o estado vazio quando não há membros", async () => {
    // Arrange
    mockApi({ method: "GET", url: "/api/members", body: [] });

    // Act
    render(<MembersPage />);

    // Assert
    expect(await screen.findByText("Nenhum membro cadastrado")).toBeInTheDocument();
  });

  it("carrega de novo ao tentar novamente depois de uma falha", async () => {
    // Arrange
    const user = userEvent.setup();
    mockApi({ method: "GET", url: "/api/members", status: 500 });
    render(<MembersPage />);
    const retry = await screen.findByRole("button", { name: "Tentar novamente" });
    mockApi({ method: "GET", url: "/api/members", body: [member()] });

    // Act
    await user.click(retry);

    // Assert
    expect(await screen.findByText("Ana Souza")).toBeInTheDocument();
  });

  it("filtra a lista pelo e-mail", async () => {
    // Arrange
    mockApi({ method: "GET", url: "/api/members", body: [member(), bruno] });
    const user = await renderLoaded();

    // Act
    await user.type(screen.getByRole("searchbox", { name: "Buscar membros" }), "bruno@");

    // Assert
    await waitFor(() => expect(screen.queryByText("Ana Souza")).not.toBeInTheDocument());
    expect(screen.getByText("Bruno Lima")).toBeInTheDocument();
  });

  it("cadastra um membro e o mostra na lista", async () => {
    // Arrange
    const created = member({ id: "m3", name: "Carla Dias", email: "carla@example.com" });
    const fetchMock = mockApi(
      { method: "GET", url: "/api/members", body: [member()] },
      { method: "POST", url: "/api/members", status: 201, body: created },
    );
    const user = await renderLoaded();
    const dialog = await fillNewMemberForm(user, created.email);

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Salvar" }));

    // Assert
    expect(await screen.findByText("Carla Dias")).toBeInTheDocument();
    expect(sentBody(fetchMock, "POST", "/api/members")).toEqual({
      name: "Carla Dias",
      email: created.email,
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("não envia o formulário com e-mail inválido", async () => {
    // Arrange
    const fetchMock = mockApi({ method: "GET", url: "/api/members", body: [member()] });
    const user = await renderLoaded();
    const dialog = await fillNewMemberForm(user, "carla");

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Salvar" }));

    // Assert
    expect(within(dialog).getByLabelText("E-mail")).toHaveAccessibleDescription(
      "Informe um e-mail válido.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("mostra no campo e-mail quando ele já está cadastrado", async () => {
    // Arrange
    mockApi(
      { method: "GET", url: "/api/members", body: [member()] },
      { method: "POST", url: "/api/members", ...duplicatedEmail },
    );
    const user = await renderLoaded();
    const dialog = await fillNewMemberForm(user, "bruno@example.com");

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Salvar" }));

    // Assert
    await waitFor(() =>
      expect(within(dialog).getByLabelText("E-mail")).toHaveAccessibleDescription(
        "Já existe um membro com este e-mail.",
      ),
    );
  });

  it("salva a edição e atualiza a lista", async () => {
    // Arrange
    const updated = member({ email: "ana.souza@example.com" });
    const fetchMock = mockApi(
      { method: "GET", url: "/api/members", body: [member()] },
      { method: "PUT", url: "/api/members/m1", body: updated },
    );
    const user = await renderLoaded();
    const dialog = await openEditForm(user, updated.email);

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Salvar" }));

    // Assert
    expect(await screen.findByText(updated.email)).toBeInTheDocument();
    expect(sentBody(fetchMock, "PUT", "/api/members/m1")).toEqual({
      name: "Ana Souza",
      email: updated.email,
    });
  });

  it("avisa na edição quando o novo e-mail é de outro membro", async () => {
    // Arrange
    mockApi(
      { method: "GET", url: "/api/members", body: [member()] },
      { method: "PUT", url: "/api/members/m1", ...duplicatedEmail },
    );
    const user = await renderLoaded();
    const dialog = await openEditForm(user, "bruno@example.com");

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Salvar" }));

    // Assert
    await waitFor(() =>
      expect(within(dialog).getByLabelText("E-mail")).toHaveAccessibleDescription(
        "Já existe um membro com este e-mail.",
      ),
    );
  });

  it("exclui um membro depois da confirmação", async () => {
    // Arrange
    mockApi(
      { method: "GET", url: "/api/members", body: [member(), bruno] },
      { method: "DELETE", url: "/api/members/m1", status: 204 },
    );
    const user = await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Excluir Ana Souza" }));
    const dialog = screen.getByRole("alertdialog", { name: "Excluir “Ana Souza”?" });

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    // Assert
    await waitFor(() => expect(screen.queryByText("Ana Souza")).not.toBeInTheDocument());
    expect(screen.getByText("Bruno Lima")).toBeInTheDocument();
  });

  it("não exclui ao cancelar a confirmação", async () => {
    // Arrange
    const fetchMock = mockApi({ method: "GET", url: "/api/members", body: [member()] });
    const user = await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Excluir Ana Souza" }));

    // Act
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    // Assert
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("explica por que não exclui membro com empréstimos ativos", async () => {
    // Arrange
    mockApi(
      { method: "GET", url: "/api/members", body: [member()] },
      {
        method: "DELETE",
        url: "/api/members/m1",
        status: 409,
        body: { message: "A member with active loans cannot be deleted" },
      },
    );
    const user = await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Excluir Ana Souza" }));
    const dialog = screen.getByRole("alertdialog");

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    // Assert
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Este membro tem empréstimos ativos e não pode ser excluído.",
    );
  });
});
