import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SortMenu, type SortOption } from "./SortMenu";

type Sort = "TITLE" | "AUTHOR" | "RECENT";

const options: SortOption<Sort>[] = [
  { value: "TITLE", label: "Título" },
  { value: "AUTHOR", label: "Autor" },
  { value: "RECENT", label: "Mais recentes" },
];

/** Renderiza o menu com "Título" escolhido e o abre. */
async function renderOpen() {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <>
      <SortMenu options={options} value="TITLE" onChange={onChange} />
      <p>Fora do menu</p>
    </>,
  );
  await user.click(screen.getByRole("button", { name: /Ordenar por/ }));
  return { user, onChange };
}

describe("Menu de ordenação", () => {
  it("abre com a opção atual marcada", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<SortMenu options={options} value="AUTHOR" onChange={vi.fn()} />);

    // Act
    await user.click(screen.getByRole("button", { name: "Ordenar por Autor" }));

    // Assert
    expect(screen.getByRole("option", { name: "Autor" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Título" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("escolhe ao pressionar o botão, deslizar até a opção e soltar", async () => {
    // Arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SortMenu options={options} value="TITLE" onChange={onChange} />);
    await user.pointer({
      keys: "[MouseLeft>]",
      target: screen.getByRole("button", { name: "Ordenar por Título" }),
    });

    // Act
    await user.pointer([
      { target: screen.getByRole("option", { name: "Autor" }) },
      { keys: "[/MouseLeft]" },
    ]);

    // Assert
    expect(onChange).toHaveBeenCalledWith("AUTHOR");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  });

  it("escolhe ao pressionar uma opção, deslizar até outra e soltar", async () => {
    // Arrange
    const { user, onChange } = await renderOpen();
    await user.pointer({
      keys: "[MouseLeft>]",
      target: screen.getByRole("option", { name: "Título" }),
    });

    // Act
    await user.pointer([
      { target: screen.getByRole("option", { name: "Mais recentes" }) },
      { keys: "[/MouseLeft]" },
    ]);

    // Assert
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("RECENT");
  });

  it("escolhe com um clique na opção", async () => {
    // Arrange
    const { user, onChange } = await renderOpen();

    // Act
    await user.click(screen.getByRole("option", { name: "Autor" }));

    // Assert
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("AUTHOR");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  });

  it("com filtro, mostra as duas seções e escolhe a situação sem mudar a ordem", async () => {
    // Arrange
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    const onFilterChange = vi.fn();
    render(
      <SortMenu
        options={options}
        value="TITLE"
        onChange={onSortChange}
        filter={{
          label: "Situação",
          options: [
            { value: "ACTIVE", label: "Ativos" },
            { value: "OVERDUE", label: "Atrasados" },
          ],
          value: "ACTIVE",
          onChange: onFilterChange,
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Situação Ativos, ordenar por Título" }));

    // Act
    await user.click(screen.getByRole("option", { name: "Atrasados" }));

    // Assert
    expect(onFilterChange).toHaveBeenCalledWith("OVERDUE");
    expect(onSortChange).not.toHaveBeenCalled();
  });
  it("abre pelo teclado", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<SortMenu options={options} value="TITLE" onChange={vi.fn()} />);
    screen.getByRole("button", { name: "Ordenar por Título" }).focus();

    // Act
    await user.keyboard("{Enter}");

    // Assert
    expect(screen.getByRole("listbox", { name: "Ordenar por" })).toBeInTheDocument();
  });
  it("escolhe pelo teclado com as setas e Enter", async () => {
    // Arrange
    const { user, onChange } = await renderOpen();

    // Act
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    // Assert
    expect(onChange).toHaveBeenCalledWith("AUTHOR");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  });

  it("fecha com Esc sem mudar a ordem e devolve o foco ao botão", async () => {
    // Arrange
    const { user, onChange } = await renderOpen();

    // Act
    await user.keyboard("{Escape}");

    // Assert
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Ordenar por/ })).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("fecha ao clicar fora", async () => {
    // Arrange
    const { user, onChange } = await renderOpen();

    // Act
    await user.click(screen.getByText("Fora do menu"));

    // Assert
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("não avisa mudança ao escolher a opção que já estava", async () => {
    // Arrange
    const { user, onChange } = await renderOpen();

    // Act
    await user.click(screen.getByRole("option", { name: "Título" }));

    // Assert
    expect(onChange).not.toHaveBeenCalled();
  });
});
