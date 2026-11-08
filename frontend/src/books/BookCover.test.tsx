import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BookCover } from "./BookCover";

const ISBN = "9788575201176";

const coverUrl = (variant: string) =>
  `https://covers.openlibrary.org/b/isbn/${ISBN}-${variant}.jpg?default=false`;

describe("Capa do livro", () => {
  it("busca a capa na Open Library pelo ISBN", () => {
    // Arrange
    const size = "large";

    // Act
    render(<BookCover isbn={ISBN} title="Dom Casmurro" size={size} />);

    // Assert
    const button = screen.getByRole("button", { name: "Ampliar capa de Dom Casmurro" });
    expect(button.querySelector("img")).toHaveAttribute("src", coverUrl("M"));
  });

  it("mostra o ícone de livro, sem ampliar, quando não há capa", () => {
    // Arrange
    const { container } = render(<BookCover isbn={ISBN} title="Dom Casmurro" size="small" />);

    // Act
    fireEvent.error(container.querySelector("img")!);

    // Assert
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("amplia a capa em tamanho grande ao tocar nela", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<BookCover isbn={ISBN} title="Dom Casmurro" size="small" />);

    // Act
    await user.click(screen.getByRole("button", { name: "Ampliar capa de Dom Casmurro" }));

    // Assert
    const dialog = screen.getByRole("dialog", { name: "Capa de Dom Casmurro" });
    const image = screen.getByRole("img", { name: "Capa de Dom Casmurro" });
    expect(dialog).toContainElement(image);
    expect(image).toHaveAttribute("src", coverUrl("L"));
  });

  it("fecha com Esc e devolve o foco à capa", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<BookCover isbn={ISBN} title="Dom Casmurro" size="small" />);
    const cover = screen.getByRole("button", { name: "Ampliar capa de Dom Casmurro" });
    await user.click(cover);

    // Act
    await user.keyboard("{Escape}");

    // Assert
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(cover).toHaveFocus();
  });

  it("trava a rolagem da página enquanto a capa está ampliada", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<BookCover isbn={ISBN} title="Dom Casmurro" size="small" />);

    // Act
    await user.click(screen.getByRole("button", { name: "Ampliar capa de Dom Casmurro" }));

    // Assert
    expect(document.documentElement.style.overflow).toBe("hidden");
  });
});
