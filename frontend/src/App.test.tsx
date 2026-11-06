import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { mockApi, page } from "./test/mockApi";

describe("Navegação entre as telas", () => {
  beforeEach(() => {
    // O hash da URL sobrevive entre os testes no jsdom
    window.history.replaceState(null, "", "/");
    mockApi(
      { method: "GET", url: "/api/books", body: page([]) },
      { method: "GET", url: "/api/members", body: page([]) },
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
    );
    render(<App />);
    await user.click(screen.getByRole("link", { name: "Membros" }));

    // Act
    await user.click(screen.getByRole("link", { name: "Livros" }));

    // Assert
    expect(screen.getByRole("heading", { level: 1, name: "Livros" })).toBeVisible();
    expect(screen.queryByText("Carregando livros…")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
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

  it("abre direto na tela do endereço", async () => {
    // Arrange
    window.history.replaceState(null, "", "/#/membros");

    // Act
    render(<App />);

    // Assert
    expect(await screen.findByRole("heading", { level: 1, name: "Membros" })).toBeInTheDocument();
  });
});
