import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TabBar } from "./TabBar";

const tabs = [
  { hash: "#/livros", label: "Livros" },
  { hash: "#/membros", label: "Membros" },
];

// O jsdom não calcula layout: posiciona as abas como no navegador (Livros em 2, Membros em 74)
function stubTabLayout() {
  const isMembers = (element: HTMLElement) => element.textContent === "Membros";
  vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return isMembers(this) ? 74 : 2;
  });
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return isMembers(this) ? 90 : 70;
  });
}

/**
 * Arrasta a pílula (que está em Livros) do ponto `from` até `to`, na horizontal, com o relógio
 * controlado (a velocidade não depende da máquina): um quadro (16 ms) entre os movimentos. Com
 * `pause`, o ponteiro para 1 s antes de soltar: a velocidade zera e não há projeção do gesto.
 */
async function dragPill(from: number, to: number, { pause }: { pause: boolean }) {
  const user = userEvent.setup();
  const livros = screen.getByRole("link", { name: "Livros" });
  let now = 10_000;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  await user.pointer({ keys: "[MouseLeft>]", target: livros, coords: { clientX: from } });
  for (const clientX of [(from + to) / 2, to]) {
    now += 16;
    await user.pointer({ coords: { clientX } });
  }
  now += pause ? 1000 : 0;
  await user.pointer({ keys: "[/MouseLeft]" });
}

describe("Abas com pílula arrastável", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/#/livros");
    stubTabLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("troca de aba ao arrastar a pílula até a outra", async () => {
    // Arrange
    render(<TabBar tabs={tabs} active="#/livros" label="Seções" />);

    // Act
    await dragPill(30, 110, { pause: true });

    // Assert
    expect(window.location.hash).toBe("#/membros");
  });

  it("continua na aba quando a pílula é solta perto dela", async () => {
    // Arrange
    render(<TabBar tabs={tabs} active="#/livros" label="Seções" />);

    // Act
    await dragPill(30, 50, { pause: true });

    // Assert
    expect(window.location.hash).toBe("#/livros");
  });

  it("troca de aba com um gesto rápido, mesmo antes de chegar à outra", async () => {
    // Arrange
    render(<TabBar tabs={tabs} active="#/livros" label="Seções" />);

    // Act
    await dragPill(30, 50, { pause: false });

    // Assert
    expect(window.location.hash).toBe("#/membros");
  });
});
